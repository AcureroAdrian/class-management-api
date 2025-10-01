'use strict'

import dotenv from 'dotenv'
import connectDB from '../config/db/db'
import { User } from '../models/User'
import { KarateClass } from '../models/KarateClass'
import { RecoveryClass } from '../models/RecoveryClass'
import { TEnrollmentPlan } from '../utils/common-types'
import { enforceOverflowAfterPlanDowngrade } from '../utils/credits-service'

dotenv.config()

const studentFilter = { isAdmin: { $ne: true }, isTeacher: { $ne: true }, isSuper: { $ne: true } }

function planFromWeeklyCount(weeklySlots: number): TEnrollmentPlan {
	if (weeklySlots >= 4) return 'Advanced'
	if (weeklySlots === 3) return 'Plus'
	if (weeklySlots === 2) return 'Optimum'
	return 'Basic'
}

async function buildWeeklySlotsPerStudent() {
	const classes = await KarateClass.find({ status: 'active' }).select('weekDays students').lean()
	const recoveryClasses = await RecoveryClass.find({ status: 'active' })
		.select('student date')
		.lean()
	const weeklyMap = new Map<string, number>()

	for (const karateClass of classes) {
		const weekDays = Array.isArray(karateClass.weekDays) && karateClass.weekDays.length > 0 ? karateClass.weekDays.length : 1
		const students = karateClass.students || []
		for (const studentId of students) {
			const key = String(studentId)
			const current = weeklyMap.get(key) || 0
			weeklyMap.set(key, current + weekDays)
		}
	}

	for (const recovery of recoveryClasses) {
		const key = String(recovery.student)
		const current = weeklyMap.get(key) || 0
		weeklyMap.set(key, current + 1)
	}

	return weeklyMap
}

async function main() {
	await connectDB()

	const [students, weeklyMap] = await Promise.all([
		User.find(studentFilter as any).select('_id enrollmentPlan').lean(),
		buildWeeklySlotsPerStudent(),
	])

	const bulkUpdates: any[] = []
	let updatedCount = 0
	let noUpdateCount = 0
	let overflowAppliedCount = 0
	const noUpdateDetails: any[] = []

	for (const student of students) {
		const weeklySlots = weeklyMap.get(String(student._id)) || 0
		const newPlan = planFromWeeklyCount(weeklySlots)

		if (student.enrollmentPlan !== newPlan) {
			bulkUpdates.push({
				updateOne: {
					filter: { _id: student._id },
					update: { $set: { enrollmentPlan: newPlan } },
				},
			})
			updatedCount += 1
		}
	}

	if (bulkUpdates.length > 0) {
		await User.bulkWrite(bulkUpdates)
		console.log(`\n=== APLICANDO OVERFLOW PARA PLANES ACTUALIZADOS ===`)

		// Aplicar overflow a los estudiantes que se actualizaron
		let overflowAppliedCount = 0
		const overflowErrors: any[] = []

		for (const update of bulkUpdates) {
			const studentId = update.updateOne.filter._id
			try {
				await enforceOverflowAfterPlanDowngrade(studentId, planFromWeeklyCount(weeklyMap.get(String(studentId)) || 0))
				overflowAppliedCount += 1
			} catch (error) {
				overflowErrors.push({
					studentId,
					error: error instanceof Error ? error.message : 'Unknown error',
				})
			}
		}

		console.log(`Overflow aplicado a ${overflowAppliedCount} estudiantes`)

		if (overflowErrors.length > 0) {
			console.log(`\n=== ERRORES EN OVERFLOW (${overflowErrors.length}) ===`)
			overflowErrors.forEach((err, index) => {
				console.log(`${index + 1}. Student ID: ${err.studentId}, Error: ${err.error}`)
			})
		}
	}

	console.log('\n=== RESUMEN FINAL ===')
	console.log(`Total estudiantes: ${students.length}`)
	console.log(`Estudiantes actualizados: ${updatedCount}`)
	console.log(`Estudiantes sin cambios: ${noUpdateCount}`)
	console.log(`Estudiantes con overflow aplicado: ${overflowAppliedCount}`)
	console.log(`Porcentaje de actualización: ${((updatedCount / students.length) * 100).toFixed(1)}%`)
	console.log('Enrollment plan assignment completed ->', {
		totalStudents: students.length,
		updatedStudents: updatedCount,
		overflowApplied: overflowAppliedCount,
	})

	process.exit(0)
}

main().catch((err) => {
	console.error('Error assigning enrollment plans automatically:', err)
	process.exit(1)
})
