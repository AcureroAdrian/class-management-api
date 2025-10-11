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

	// 1) Poner a todos los estudiantes en plan Advanced para reiniciar desde cero
	const studentFilter = { isAdmin: { $ne: true }, isTeacher: { $ne: true }, isSuper: { $ne: true } }
	const studentUpdate = { $set: { enrollmentPlan: 'Advanced' } }
	const studentResult = await User.updateMany(studentFilter as any, studentUpdate)
	console.log('Planes actualizados a Advanced:', {
		matchedCount: (studentResult as any).matchedCount ?? (studentResult as any).n,
		modifiedCount: (studentResult as any).modifiedCount ?? (studentResult as any).nModified,
	})

	const syntheticClass = await KarateClass.findOne({ name: SYNTHETIC_CLASS_NAME }).lean()
	if (!syntheticClass) {
		throw new Error(`Clase sintética '${SYNTHETIC_CLASS_NAME}' no encontrada`)
	}

	// 2) Limpiar todas las asistencias sintéticas y marcarlas como inasistencia
	const attendanceResult = await StudentAttendance.updateMany(
		{ karateClass: syntheticClass._id },
		{
			$set: {
				'attendance.$[].attendanceStatus': 'absent',
				'attendance.$[].isOverflowAbsence': false,
				'attendance.$[].isDayOnly': false,
				'attendance.$[].isRecovery': false,
			},
			$unset: {
				'attendance.$[].overflowReason': '',
				'attendance.$[].recoveryClassId': '',
			},
		},
	)

	console.log('Asistencias sintéticas limpiadas:', {
		matchedCount: (attendanceResult as any).matchedCount ?? (attendanceResult as any).n,
		modifiedCount: (attendanceResult as any).modifiedCount ?? (attendanceResult as any).nModified,
	})

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error eliminando overflow en clases sintéticas:', err)
	await mongoose.connection.close()
	process.exit(1)
})



