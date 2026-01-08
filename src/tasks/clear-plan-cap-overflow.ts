'use strict'

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'

import connectDB from '../config/db/db'
import { StudentAttendance } from '../models/StudentAttendance'

async function main() {
	await connectDB()

	const result = await StudentAttendance.updateMany(
		{ 'attendance.overflowReason': 'plan-cap' },
		{
			$set: {
				'attendance.$[entry].isOverflowAbsence': false,
			},
			$unset: {
				'attendance.$[entry].overflowReason': '',
			},
		},
		{
			arrayFilters: [{ 'entry.overflowReason': 'plan-cap' }],
		},
	)

	const matched = (result as any).matchedCount ?? (result as any).n
	const modified = (result as any).modifiedCount ?? (result as any).nModified

	console.log('Overflow plan-cap limpiado:', { matched, modified })

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error limpiando overflow plan-cap:', err)
	await mongoose.connection.close()
	process.exit(1)
})




