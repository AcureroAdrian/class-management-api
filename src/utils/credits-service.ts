'use strict'

import mongoose from 'mongoose'
import { StudentAttendance } from '../models/StudentAttendance'
import { RecoveryClass } from '../models/RecoveryClass'
import { User } from '../models/User'
import { getCurrentDateInHouston } from './houston-timezone'

export type TEnrollmentPlan = 'Basic' | 'Optimum' | 'Plus' | 'Advanced'

const planToMaxPending: Record<TEnrollmentPlan, number> = {
	Basic: 2,
	Optimum: 4,
	Plus: 6,
	Advanced: 8,
}

export function getMaxPendingForPlan(plan?: TEnrollmentPlan): number {
	if (!plan) return planToMaxPending.Optimum
	return planToMaxPending[plan] ?? planToMaxPending.Optimum
}

// Regla 1:1 (cada inasistencia = 1 crédito)
export function computeCreditsFromAbsences(absencesCount: number): number {
	if (!absencesCount || absencesCount <= 0) return 0
	return absencesCount
}

// Obtiene la cantidad de ausencias contables (no overflow) del año actual hasta ayer
// Ya no excluye por estar reservadas - el pool se calcula independientemente
export async function getCountableAbsencesForYear(studentId: string): Promise<number> {
	const now = getCurrentDateInHouston()
	const year = now.getFullYear()

	// Calcular la fecha de ayer
	const yesterday = new Date(now)
	yesterday.setDate(yesterday.getDate() - 1)
	const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

	// Ahora obtener el conteo
	const results = await StudentAttendance.aggregate([
		{ $match: { 'date.year': year, status: 'active' } },
		{
			$addFields: {
				fullDate: {
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
		{ $match: { fullDate: { $lte: yesterdayEnd } } },
		{ $unwind: '$attendance' },
		{
			$match: {
				'attendance.student': new mongoose.Types.ObjectId(studentId),
				'attendance.attendanceStatus': { $in: ['absent', 'sick'] },
				'attendance.isDayOnly': { $ne: true },
				'attendance.isRecovery': { $ne: true },
				'attendance.isOverflowAbsence': { $ne: true },
			},
		},
		{ $count: 'count' },
	])

	const count = results?.[0]?.count || 0

	return count
}

// Obtiene la cantidad de bookings activos del año actual
export async function getActiveBookingsCountForYear(studentId: string): Promise<number> {
	const now = getCurrentDateInHouston()
	const year = now.getFullYear()

	return await RecoveryClass.countDocuments({
		student: new mongoose.Types.ObjectId(studentId),
		status: 'active',
		'date.year': year,
	})
}

export async function getAbsenceAndBookingSnapshot(studentId: string) {
	const [absencesCount, bookedCount] = await Promise.all([
		getCountableAbsencesForYear(studentId),
		getActiveBookingsCountForYear(studentId),
	])

	const consumedAbsences = Math.min(absencesCount, bookedCount)
	const pendingAbsences = Math.max(0, absencesCount - consumedAbsences)

	return {
		absencesCount,
		bookedCount,
		consumedAbsences,
		pendingAbsences,
	}
}

export async function getAvailableCreditsForStudent(studentId: string) {
	const user = await User.findById(studentId).lean()
	const plan = (user?.enrollmentPlan as TEnrollmentPlan) || 'Optimum'
	const maxPending = getMaxPendingForPlan(plan)

	// Si no está activo o es trial, no genera por ausencias
	const isFrozen = user?.status !== 'active' || !plan
	const { pendingAbsences, bookedCount, absencesCount } =
		isFrozen || user?.isTrial
			? { pendingAbsences: 0, bookedCount: 0, absencesCount: 0 }
			: await getAbsenceAndBookingSnapshot(studentId)

	// Créditos por ausencias disponibles = min(ausencias pendientes, tope del plan)
	const absenceCreditsAvailable = Math.min(pendingAbsences, maxPending)

	// Ajustes manuales (no cuentan para el tope)
	const adjustment = user?.recoveryCreditsAdjustment || 0

	// Si hay más bookings que ausencias, el excedente consume el ajuste manual
	const extraBookingsBeyondAbsences = Math.max(0, bookedCount - absencesCount)
	const adjustmentRemaining = Math.max(0, adjustment - extraBookingsBeyondAbsences)

	// Créditos disponibles totales = créditos por ausencias disponibles + ajuste restante
	const availableCredits = Math.max(0, absenceCreditsAvailable + adjustmentRemaining)

	return {
		plan,
		maxPending,
		creditsFromAbsences: absenceCreditsAvailable,
		adjustment,
		bookedCount,
		poolCredits: absenceCreditsAvailable + adjustmentRemaining,
		totalCredits: availableCredits, // mantener nombre usado por el front
		isFrozen,
	}
}

// Determina si una nueva ausencia debería marcarse como overflow dados los contadores actuales
export function shouldOverflowNewAbsence(currentPendingAbsences: number, planMaxPending: number): boolean {
	// Si ya alcanzó el tope de ausencias contables, la siguiente ausencia es overflow
	return currentPendingAbsences >= planMaxPending
}

// Recalcula overflow tras un cambio de plan (solo agrega overflow; no lo remueve).
export async function enforceOverflowAfterPlanDowngrade(studentId: string, newPlan: TEnrollmentPlan) {
	const now = getCurrentDateInHouston()
	const year = now.getFullYear()
	const planMax = getMaxPendingForPlan(newPlan)
	const { bookedCount } = await getAbsenceAndBookingSnapshot(studentId)

	const items = await StudentAttendance.aggregate([
		{ $match: { 'date.year': year, status: 'active' } },
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
				'attendance.student': new mongoose.Types.ObjectId(studentId),
				'attendance.attendanceStatus': { $in: ['absent', 'sick'] },
				'attendance.isDayOnly': { $ne: true },
				'attendance.isRecovery': { $ne: true },
			},
		},
		{ $sort: { attendanceDate: 1 } },
	])

	let countable = 0
	let recoveredToSkip = Math.min(bookedCount, items.length)
	const updates: { filter: any; update: any }[] = []

	for (const it of items) {
		const subId = it.attendance?._id
		const alreadyOverflow = Boolean(it.attendance?.isOverflowAbsence)

		if (alreadyOverflow) {
			continue
		}

		if (recoveredToSkip > 0) {
			recoveredToSkip -= 1
			continue
		}

		if (shouldOverflowNewAbsence(countable, planMax)) {
			updates.push({
				filter: { _id: it._id, 'attendance._id': subId },
				update: {
					$set: {
						'attendance.$.isOverflowAbsence': true,
						'attendance.$.overflowReason': 'plan-downgrade',
					},
				},
			})
			continue
		}

		countable += 1
		if (it.attendance?.overflowReason) {
			updates.push({
				filter: { _id: it._id, 'attendance._id': subId },
				update: { $unset: { 'attendance.$.overflowReason': '' } },
			})
		}
	}

	if (updates.length) {
		const bulk = updates.map((it) => ({ updateOne: it }))
		await StudentAttendance.bulkWrite(bulk as any)
	}
}
