'use strict'

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import * as XLSX from 'xlsx'
import connectDB from '../config/db/db'
import { StudentAttendance } from '../models/StudentAttendance'

async function main() {
	await connectDB()

	// Traer TODA la data activa de asistencias, con joins a clase y estudiante
	const docs = await StudentAttendance.aggregate([
		{ $match: { status: 'active' } },
		{
			$lookup: {
				from: 'karateclasses',
				localField: 'karateClass',
				foreignField: '_id',
				as: 'karateClass',
			},
		},
		{ $unwind: '$karateClass' },
		{ $unwind: '$attendance' },
		{
			$lookup: {
				from: 'users',
				localField: 'attendance.student',
				foreignField: '_id',
				as: 'student',
			},
		},
		{ $unwind: '$student' },
		{
			$project: {
				className: '$karateClass.name',
				classLocation: '$karateClass.location',
				date: '$date',
				attendanceStatus: '$attendance.attendanceStatus',
				observations: '$attendance.observations',
				isDayOnly: '$attendance.isDayOnly',
				isRecovery: '$attendance.isRecovery',
				isOverflowAbsence: '$attendance.isOverflowAbsence',
				overflowReason: '$attendance.overflowReason',
				studentId: '$student.userId',
				studentName: '$student.name',
				studentLastName: '$student.lastName',
				enrollmentPlan: '$student.enrollmentPlan',
				studentStatus: '$student.status',
			},
		},
		{ $sort: { 'date.year': 1, 'date.month': 1, 'date.day': 1, className: 1, studentLastName: 1, studentName: 1 } },
	])

	const rows = docs.map((d: any) => {
		const yyyy = d?.date?.year?.toString()?.padStart(4, '0')
		const mm = (d?.date?.month || 0).toString().padStart(2, '0')
		const dd = (d?.date?.day || 0).toString().padStart(2, '0')
		return {
			Date: `${yyyy}-${mm}-${dd}`,
			Year: d?.date?.year,
			Month: d?.date?.month,
			Day: d?.date?.day,
			ClassName: d?.className,
			Location: d?.classLocation,
			StudentId: d?.studentId,
			StudentName: d?.studentName,
			StudentLastName: d?.studentLastName,
			EnrollmentPlan: d?.enrollmentPlan,
			StudentStatus: d?.studentStatus,
			AttendanceStatus: d?.attendanceStatus,
			IsDayOnly: Boolean(d?.isDayOnly),
			IsRecovery: Boolean(d?.isRecovery),
			IsOverflowAbsence: Boolean(d?.isOverflowAbsence),
			OverflowReason: d?.overflowReason || '',
			Observations: d?.observations || '',
		}
	})

	const headers = [
		'Date',
		'Year',
		'Month',
		'Day',
		'ClassName',
		'Location',
		'StudentId',
		'StudentName',
		'StudentLastName',
		'EnrollmentPlan',
		'StudentStatus',
		'AttendanceStatus',
		'IsDayOnly',
		'IsRecovery',
		'IsOverflowAbsence',
		'OverflowReason',
		'Observations',
	]

	const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'ClassReport')

	const outDir = path.resolve(process.cwd(), 'exports')
	fs.mkdirSync(outDir, { recursive: true })
	const stamp = new Date().toISOString().slice(0, 10)
	const outFile = path.resolve(outDir, `class-report-${stamp}.xlsx`)
	XLSX.writeFile(wb, outFile)

	console.log(`Excel generado: ${outFile}`)
	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error(err)
	await mongoose.connection.close()
	process.exit(1)
})


