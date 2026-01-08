'use strict'

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'

import connectDB from '../config/db/db'
import { StudentAttendance } from '../models/StudentAttendance'
import { User } from '../models/User'

async function main() {
	await connectDB()

	const fixResult = await StudentAttendance.updateMany(
		{ 'attendance.isOverflowAbsence': true },
		{
			$set: {
				'attendance.$[entry].isOverflowAbsence': false,
			},
		},
		{
			arrayFilters: [
				{
					'entry.isOverflowAbsence': true,
					'entry.overflowReason': { $exists: false },
				},
			],
		},
	)

	const fixedMatched = (fixResult as any).matchedCount ?? (fixResult as any).n ?? 0
	const fixedModified = (fixResult as any).modifiedCount ?? (fixResult as any).nModified ?? 0
	console.log('Overflow sin razón normalizado a false:', {
		matched: fixedMatched,
		modified: fixedModified,
	})

	const pipeline: any[] = [
		{ $unwind: '$attendance' },
		{
			$match: {
				'attendance.isOverflowAbsence': true,
				'attendance.overflowReason': { $exists: true, $ne: 'plan-downgrade' },
			},
		},
		{
			$group: {
				_id: {
					student: '$attendance.student',
					reason: '$attendance.overflowReason',
				},
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1 } },
	]

	const results = await StudentAttendance.aggregate(pipeline)

	if (!results.length) {
		console.log('No se encontraron asistencias overflow con overflowReason distinto de plan-downgrade.')
		await mongoose.connection.close()
		return
	}

	const studentIds = Array.from(
		new Set(results.map((item: any) => String(item._id.student)).filter(Boolean)),
	)

	const users = await User.find({ _id: { $in: studentIds } })
		.select(['name', 'lastName'])
		.lean()

	const userMap = new Map<string, { name?: string; lastName?: string }>()
	for (const user of users) {
		userMap.set(String(user._id), { name: user.name, lastName: user.lastName })
	}

	const reasonTotals = new Map<string, number>()
	let globalTotal = 0

	results.forEach((item: any) => {
		const reason = String(item._id.reason ?? 'sin-reason')
		const current = reasonTotals.get(reason) ?? 0
		reasonTotals.set(reason, current + (item.count ?? 0))
		globalTotal += item.count ?? 0
	})

	console.log('--- Totales por overflowReason (≠ plan-downgrade) ---')
	for (const [reason, total] of reasonTotals.entries()) {
		console.log(`${reason}: ${total}`)
	}
	console.log(`Total general: ${globalTotal}`)

	console.log('--- Detalle por estudiante ---')
	results.forEach((item: any) => {
		const studentId = String(item._id.student)
		const info = userMap.get(studentId)
		console.log({
			studentId,
			name: info ? `${info.name ?? ''} ${info.lastName ?? ''}`.trim() : 'Desconocido',
			reason: item._id.reason,
			count: item.count,
		})
	})

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error reportando overflow no plan-downgrade:', err)
	await mongoose.connection.close()
	process.exit(1)
})


