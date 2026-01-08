'use strict'

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'

import connectDB from '../config/db/db'
import { KarateClass } from '../models/KarateClass'
import { StudentAttendance } from '../models/StudentAttendance'
import { User } from '../models/User'

const SYNTHETIC_CLASS_NAME = 'Synthetic Credit Seed Class'

async function main() {
	await connectDB()

	const syntheticClass = await KarateClass.findOne({ name: SYNTHETIC_CLASS_NAME }).select('_id').lean()
	if (!syntheticClass) {
		throw new Error(`Clase sintética '${SYNTHETIC_CLASS_NAME}' no encontrada`)
	}

	const pipeline: any[] = [
		{ $match: { karateClass: syntheticClass._id } },
		{ $unwind: '$attendance' },
		{ $match: { 'attendance.overflowReason': 'plan-cap' } },
		{
			$group: {
				_id: '$attendance.student',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1 } },
	]

	const results = await StudentAttendance.aggregate(pipeline)
	const studentIds = results.map((item: any) => item._id).filter(Boolean)

	const users = await User.find({ _id: { $in: studentIds } })
		.select(['name', 'lastName'])
		.lean()

	const userMap = new Map<string, { name?: string; lastName?: string }>()
	for (const user of users) {
		userMap.set(String(user._id), { name: user.name, lastName: user.lastName })
	}

	const totalOverflow = results.reduce((sum: number, item: any) => sum + (item.count ?? 0), 0)

	console.log('Resumen de overflow plan-cap en clases sintéticas:')
	console.log(`Total de asistencias con overflow plan-cap: ${totalOverflow}`)

	if (!results.length) {
		console.log('No se encontraron asistencias con overflow plan-cap.')
		await mongoose.connection.close()
		return
	}

	console.log('Detalle por estudiante:')
	results.forEach((item: any) => {
		const info = userMap.get(String(item._id))
		console.log({
			studentId: String(item._id),
			name: info ? `${info.name ?? ''} ${info.lastName ?? ''}`.trim() : 'Desconocido',
			overflowCount: item.count,
		})
	})

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error analizando overflow plan-cap en clases sintéticas:', err)
	await mongoose.connection.close()
	process.exit(1)
})


