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

// Obtiene la cantidad de ausencias contables (no overflow) de todo el historial hasta ayer
// Ya no excluye por estar reservadas - el pool se calcula independientemente
export async function getCountableAbsencesForYear(studentId: string): Promise<number> {
	const now = getCurrentDateInHouston()

	// Calcular la fecha de ayer
	const yesterday = new Date(now)
	yesterday.setDate(yesterday.getDate() - 1)
	const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

	// Ahora obtener el conteo
	const results = await StudentAttendance.aggregate([
		// Match temprano por alumno para no escanear toda la colección al quitar el filtro por año
		{ $match: { status: 'active', 'attendance.student': new mongoose.Types.ObjectId(studentId) } },
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

// Obtiene la cantidad de bookings activos de todo el historial
export async function getActiveBookingsCountForYear(studentId: string): Promise<number> {
	return await RecoveryClass.countDocuments({
		student: new mongoose.Types.ObjectId(studentId),
		status: 'active',
	})
}

// Cantidad de bookings activos de todo el historial que consumieron ajuste manual
export async function getActiveAdjustmentBookingsCountForYear(studentId: string): Promise<number> {
	return await RecoveryClass.countDocuments({
		student: new mongoose.Types.ObjectId(studentId),
		status: 'active',
		usedAdjustment: true,
	})
}

export async function getAbsenceAndBookingSnapshot(studentId: string) {
	const [absencesCount, bookedCount, adjustmentBookedCount] = await Promise.all([
		getCountableAbsencesForYear(studentId),
		getActiveBookingsCountForYear(studentId),
		getActiveAdjustmentBookingsCountForYear(studentId),
	])

	console.log({absencesCount, bookedCount, adjustmentBookedCount})

	// Solo las reservas SIN ajuste consumen ausencias; las con ajuste no reducen ausencias pendientes
	const nonAdjustmentBookedCount = Math.max(0, bookedCount - adjustmentBookedCount)
	const consumedAbsences = Math.min(absencesCount, nonAdjustmentBookedCount)
	const pendingAbsences = Math.max(0, absencesCount - consumedAbsences)

	console.log({consumedAbsences, pendingAbsences})

	return {
		absencesCount,
		bookedCount,
		consumedAbsences,
		pendingAbsences,
		adjustmentBookedCount,
	}
}

export type SnapshotInfo = {
	absencesCount: number
	bookedCount: number
	consumedAbsences: number
	pendingAbsences: number
	adjustmentBookedCount: number
}

const ZERO_SNAPSHOT: SnapshotInfo = {
	absencesCount: 0,
	bookedCount: 0,
	consumedAbsences: 0,
	pendingAbsences: 0,
	adjustmentBookedCount: 0,
}

export type AvailableCreditsInfo = {
	plan: TEnrollmentPlan
	maxPending: number
	creditsFromAbsences: number
	adjustment: number
	adjustmentTotal: number
	adjustmentUsed: number
	bookedCount: number
	adjustmentBookedCount: number
	absencesCount: number
	consumedAbsences: number
	pendingAbsences: number
	poolCredits: number
	totalCredits: number
	isFrozen: boolean
}

type CreditsComputationUser = {
	enrollmentPlan?: TEnrollmentPlan
	status?: string
	isTrial?: boolean
	recoveryCreditsAdjustment?: number
	usedRecoveryAdjustmentCredits?: number
} | null | undefined

export function computeAvailableCreditsFromSnapshot(
	user: CreditsComputationUser,
	snapshot?: SnapshotInfo,
): AvailableCreditsInfo {
	const hasPlan = Boolean(user?.enrollmentPlan)
	const plan = (hasPlan ? (user?.enrollmentPlan as TEnrollmentPlan) : 'Optimum') as TEnrollmentPlan
	const maxPending = getMaxPendingForPlan(plan)
	const isFrozen = user?.status !== 'active' || !hasPlan
	const isTrial = Boolean(user?.isTrial)

	const baseSnapshot = snapshot ?? ZERO_SNAPSHOT
	const effectiveSnapshot = isFrozen || isTrial ? ZERO_SNAPSHOT : baseSnapshot

	const absencesCount = effectiveSnapshot?.absencesCount ?? 0
	const bookedCount = effectiveSnapshot?.bookedCount ?? 0
	const consumedAbsences = effectiveSnapshot?.consumedAbsences ?? 0
	const pendingAbsences = effectiveSnapshot?.pendingAbsences ?? 0
	const adjustmentBookedCount = effectiveSnapshot?.adjustmentBookedCount ?? 0

	const creditsFromAbsences = Math.min(pendingAbsences, maxPending)
	const adjustmentTotal = user?.recoveryCreditsAdjustment ?? 0
	const adjustmentUsed = user?.usedRecoveryAdjustmentCredits ?? 0

	// Destructivos
	const adjustmentNet = adjustmentTotal - adjustmentUsed
	const availableCredits = creditsFromAbsences + adjustmentNet

	return {
		plan,
		maxPending,
		creditsFromAbsences,
		adjustment: adjustmentNet,
		adjustmentTotal,
		adjustmentUsed,
		bookedCount,
		adjustmentBookedCount,
		absencesCount,
		consumedAbsences,
		pendingAbsences,
		poolCredits: availableCredits,
		totalCredits: availableCredits,
		isFrozen,
	}
}

export async function getMultipleAbsenceSnapshots(studentIds: string[]): Promise<Map<string, SnapshotInfo>> {
	const map = new Map<string, SnapshotInfo>()
	if (!studentIds?.length) {
		return map
	}

	const now = getCurrentDateInHouston()

	const yesterday = new Date(now)
	yesterday.setDate(yesterday.getDate() - 1)
	const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

	const idsAsObjectId = studentIds.map((id) => new mongoose.Types.ObjectId(id))

	const absencesPipeline = [
		// Match temprano por alumnos para evitar escaneo completo al usar histórico
		{ $match: { status: 'active', 'attendance.student': { $in: idsAsObjectId } } },
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
				'attendance.student': { $in: idsAsObjectId },
				'attendance.attendanceStatus': { $in: ['absent', 'sick'] },
				'attendance.isDayOnly': { $ne: true },
				'attendance.isRecovery': { $ne: true },
				'attendance.isOverflowAbsence': { $ne: true },
			},
		},
		{
			$group: {
				_id: '$attendance.student',
				absencesCount: { $sum: 1 },
			},
		},
	]

	const absencesCounts = await StudentAttendance.aggregate(absencesPipeline)
	for (const item of absencesCounts) {
		map.set(String(item._id), {
			absencesCount: item.absencesCount ?? 0,
			bookedCount: 0,
			consumedAbsences: 0,
			pendingAbsences: 0,
			adjustmentBookedCount: 0,
		})
	}

	const bookings = await RecoveryClass.aggregate([
		{
			$match: {
				student: { $in: idsAsObjectId },
				status: 'active',
			},
		},
		{
			$group: {
				_id: '$student',
				bookedCount: { $sum: 1 },
				adjustmentBookedCount: {
					$sum: {
						$cond: [{ $eq: ['$usedAdjustment', true] }, 1, 0],
					},
				},
			},
		},
	])

	for (const booking of bookings) {
		const key = String(booking._id)
		const existing = map.get(key) || {
			absencesCount: 0,
			bookedCount: 0,
			consumedAbsences: 0,
			pendingAbsences: 0,
			adjustmentBookedCount: 0,
		}
		existing.bookedCount = booking.bookedCount ?? 0
		existing.adjustmentBookedCount = booking.adjustmentBookedCount ?? 0
		map.set(key, existing)
	}

	for (const [key, info] of map.entries()) {
		const nonAdjustmentBookedCount = Math.max(0, info.bookedCount - info.adjustmentBookedCount)
		const consumedAbsences = Math.min(info.absencesCount, nonAdjustmentBookedCount)
		const pendingAbsences = Math.max(0, info.absencesCount - consumedAbsences)
		map.set(key, {
			...info,
			consumedAbsences,
			pendingAbsences,
		})
	}

	// Asegurar que todos tienen entrada
	for (const id of studentIds) {
		if (!map.has(id)) {
			map.set(id, {
				absencesCount: 0,
				bookedCount: 0,
				consumedAbsences: 0,
				pendingAbsences: 0,
				adjustmentBookedCount: 0,
			})
		}
	}

	return map
}

export async function getAvailableCreditsForStudent(studentId: string) {
	const user = await User.findById(studentId).lean()
	const isFrozen = user?.status !== 'active' || !user?.enrollmentPlan
	const needsSnapshot = Boolean(user) && !isFrozen && !user?.isTrial
	const snapshot = needsSnapshot ? await getAbsenceAndBookingSnapshot(studentId) : undefined

	return computeAvailableCreditsFromSnapshot(user, snapshot)
}

// Determina si una nueva ausencia debería marcarse como overflow dados los contadores actuales
export function shouldOverflowNewAbsence(currentPendingAbsences: number, planMaxPending: number): boolean {
	// Si ya alcanzó el tope de ausencias contables, la siguiente ausencia es overflow
	return currentPendingAbsences >= planMaxPending
}

// Recalcula overflow tras un cambio de plan (solo agrega overflow; no lo remueve).
export async function enforceOverflowAfterPlanDowngrade(studentId: string, newPlan: TEnrollmentPlan) {
	const planMax = getMaxPendingForPlan(newPlan)
	const { bookedCount } = await getAbsenceAndBookingSnapshot(studentId)

	const items = await StudentAttendance.aggregate([
		// Histórico: sin filtro por año. Match temprano por alumno para reducir carga.
		{ $match: { status: 'active', 'attendance.student': new mongoose.Types.ObjectId(studentId) } },
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
