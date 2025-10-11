'use strict'

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db/db'
import { User } from '../models/User'
import { StudentAttendance } from '../models/StudentAttendance'
import { KarateClass } from '../models/KarateClass'

async function main() {
	await connectDB()

	// 1) Asegurar clase ficticia
	const CLASS_NAME = 'Synthetic Credit Seed Class'
	let ghostClass = await KarateClass.findOne({ name: CLASS_NAME }).lean()
	if (!ghostClass) {
		const created = await KarateClass.create({
			name: CLASS_NAME,
			description: 'Clase ficticia para seed de créditos',
			minAge: 0,
			maxAge: 100,
			levels: ['beginner'],
			weekDays: ['monday'],
			startTime: { hour: 0, minute: 0 },
			students: [],
			location: 'spring',
			status: 'active',
		})
		ghostClass = created.toObject()
	}

	// 2) Traer estudiantes activos no admin/teacher/super
	const students = await User.find({
		status: 'active',
		isAdmin: false,
		isTeacher: false,
		isSuper: false,
	}).lean()

	if (!students.length) {
		console.log('No hay estudiantes activos para seed.')
		await mongoose.connection.close()
		return
	}

	// 3) Actualizar plan a Advanced en bloque
	await User.updateMany(
		{ _id: { $in: students.map((s) => s._id) } },
		{ $set: { enrollmentPlan: 'Advanced' } },
	)

	// 4) Generar 8 fechas antes del 18 de julio del año actual
	const now = new Date()
	const year = now.getFullYear()
	const cutoff = new Date(year, 6, 18) // 18 Julio (mes 6)

	// Tomaremos 8 días previos a la fecha de corte: 10,11,12,13,14,15,16,17 de julio
	const days = [10, 11, 12, 13, 14, 15, 16, 17]

	const attendancesPayload = days.map((day) => ({
		karateClass: ghostClass?._id,
		date: { year, month: 7, day, hour: 0, minute: 0 },
		attendance: students.map((s) => ({
			student: s._id,
			attendanceStatus: 'absent',
			isDayOnly: false,
			isRecovery: false,
		})),
		status: 'active',
	}))

	await StudentAttendance.insertMany(attendancesPayload)

	console.log('Seed de ausencias sintéticas completado.')
	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error(err)
	await mongoose.connection.close()
	process.exit(1)
})


