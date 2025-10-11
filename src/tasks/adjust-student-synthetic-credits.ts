'use strict'

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db/db'
import { User } from '../models/User'
import { KarateClass } from '../models/KarateClass'
import { StudentAttendance } from '../models/StudentAttendance'
import { enforceOverflowAfterPlanDowngrade } from '../utils/credits-service'
import { TEnrollmentPlan } from '../utils/common-types'

// ================== PARAMETROS A EDITAR ==================
// Reemplaza estos valores antes de ejecutar el script
const TARGET_STUDENT_ID = '68c86288cbe381f770745af6' // Ej: 64f0...a12
const TARGET_PLAN: TEnrollmentPlan = 'Basic' // 'Basic' | 'Optimum' | 'Plus' | 'Advanced'
const TARGET_CREDITS = 0 // Créditos deseados	 tras el ajuste
const SYNTHETIC_CLASS_NAME = 'Synthetic Credit Seed Class'
// =========================================================

async function main() {
	if (!mongoose.Types.ObjectId.isValid(TARGET_STUDENT_ID)) {
		throw new Error('TARGET_STUDENT_ID inválido')
	}
	if (TARGET_CREDITS < 0) {
		throw new Error('TARGET_CREDITS no puede ser negativo')
	}

	await connectDB()

	const student = await User.findById(TARGET_STUDENT_ID)
	if (!student) throw new Error('Estudiante no encontrado')

	// 1) Actualizar plan del estudiante (si es distinto)
	if (student.enrollmentPlan !== TARGET_PLAN) {
		student.enrollmentPlan = TARGET_PLAN
		await student.save()
		console.log(`Plan actualizado a ${TARGET_PLAN} para ${student.name} ${student.lastName}`)
	}

	// 2) Asegurar que el overflow se aplique según el nuevo plan
	await enforceOverflowAfterPlanDowngrade(TARGET_STUDENT_ID, TARGET_PLAN)

	// 3) Ubicar la clase sintética
	const syntheticClass = await KarateClass.findOne({ name: SYNTHETIC_CLASS_NAME }).lean()
	if (!syntheticClass) throw new Error(`Clase sintética '${SYNTHETIC_CLASS_NAME}' no encontrada`)

	// 4) Traer todas las ausencias sintéticas del alumno, separando contables vs overflow
	const items = await StudentAttendance.aggregate([
		{ $match: { karateClass: syntheticClass._id, status: 'active' } },
		{
			$addFields: {
				attendanceDate: {
					$dateFromParts: {
						year: '$date.year',
						month: '$date.month',
						day: '$date.day',
						hour: '$date.hour',
						minute: '$date.minute',
					},
				},
			},
		},
		{ $unwind: '$attendance' },
		{
			$match: {
				'attendance.student': new mongoose.Types.ObjectId(TARGET_STUDENT_ID),
				'attendance.attendanceStatus': { $in: ['absent', 'sick'] },
				'attendance.isDayOnly': { $ne: true },
				'attendance.isRecovery': { $ne: true },
			},
		},
		{ $sort: { attendanceDate: 1 } }, // más viejas primero
		{
			$project: {
				rootId: '$_id',
				subId: '$attendance._id',
				isOverflowAbsence: '$attendance.isOverflowAbsence',
				attendanceStatus: '$attendance.attendanceStatus',
				attendanceDate: 1,
				date: '$date',
			},
		},
	])

	const countable = items.filter((x: any) => !x.isOverflowAbsence)
	const currentCredits = countable.length
	console.log({ currentCredits, desired: TARGET_CREDITS })

	if (currentCredits <= TARGET_CREDITS) {
		console.log('No hay nada que reducir: los créditos actuales ya son <= objetivo.')
		await mongoose.connection.close()
		return
	}

	const toReduce = currentCredits - TARGET_CREDITS
	const targets = countable.slice(0, toReduce)

	const bulkUpdates = targets.map((t: any) => ({
		updateOne: {
			filter: { _id: t.rootId, 'attendance._id': t.subId },
			update: {
				$set: {
					'attendance.$.attendanceStatus': 'present',
					'attendance.$.isOverflowAbsence': false,
					'attendance.$.isDayOnly': false,
					'attendance.$.isRecovery': false,
				},
				$unset: {
					'attendance.$.overflowReason': '',
				},
			},
		},
	}))

	if (bulkUpdates.length > 0) {
		const res = await StudentAttendance.bulkWrite(bulkUpdates as any)
		console.log('Actualizaciones realizadas:', {
			matchedCount: (res as any).matchedCount ?? (res as any).nMatched,
			modifiedCount: (res as any).modifiedCount ?? (res as any).nModified,
		})
	} else {
		console.log('No se encontraron registros para actualizar.')
	}

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error ajustando créditos sintéticos:', err)
	await mongoose.connection.close()
	process.exit(1)
})


