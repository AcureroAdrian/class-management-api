'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import {
	getMultipleAbsenceSnapshots,
	getMaxPendingForPlan,
	shouldOverflowNewAbsence,
} from '../../utils/credits-service'
import * as userRepository from '../../repositories/user-repository'

// @desc    PATCH update student attendance by id
// @route   PATCH /api/student-attendances/:id
// @access  Admin
export const updateStudentAttendanceById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params
	const { attendance } = req.body

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid attendance id.')
	}

	if (!attendance?.length || !attendance.every((item: any) => mongoIdValidator(item.student))) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid attendance data.')
	}

	const studentAttendance = await studentAttendanceRepository.findStudentAttendanceById(id)

	if (!studentAttendance) {
		res.status(NOT_FOUND)
		throw new Error('Attendance not found.')
	}

	// Construir nueva lista de asistencia aplicando lógica de overflow por alumno
	const existingAttendance = studentAttendance.attendance || []
	const existingByStudent = new Map<string, any>(existingAttendance.map((a: any) => [a.student.toString(), a]))

	const updatedAttendance = [] as any[]

	const targetStudents = attendance.filter(
		(item: any) =>
			(item.attendanceStatus === 'absent' || item.attendanceStatus === 'sick') && !item.isDayOnly && !item.isRecovery,
	)
	const uniqueStudentIds: string[] = Array.from(new Set(targetStudents.map((item: any) => String(item.student))))

	const users = await userRepository.findUsersByIds(uniqueStudentIds)

	const userById = new Map<string, any>()
	for (const user of users) {
		userById.set(String(user._id), user)
	}

	const snapshotsByStudent = uniqueStudentIds.length ? await getMultipleAbsenceSnapshots(uniqueStudentIds) : new Map()
	for (const item of attendance) {
		const studentId = String(item.student)
		const prev = existingByStudent.get(studentId)

		let isOverflowAbsence = Boolean(prev?.isOverflowAbsence)
		let overflowReason = prev?.overflowReason

		if ((item.attendanceStatus === 'absent' || item.attendanceStatus === 'sick') && !item.isDayOnly && !item.isRecovery) {
			const user = userById.get(studentId)
			const planMax = getMaxPendingForPlan((user?.enrollmentPlan as any) || 'Optimum')

			// Obtener snapshot de ausencias y bookings activos
			const pendingAbsences =
				user?.isTrial || user?.status !== 'active'
					? 0
					: snapshotsByStudent.get(studentId)?.pendingAbsences ?? 0

			// Decidir si esta nueva ausencia debería overflow considerando ausencias ya recuperadas
			if (shouldOverflowNewAbsence(pendingAbsences, planMax)) {
				isOverflowAbsence = true
				overflowReason = overflowReason || 'plan-cap'
			} else {
				overflowReason = undefined
			}
		}

		updatedAttendance.push({
			...item,
			isOverflowAbsence:
				item.attendanceStatus === 'absent' || item.attendanceStatus === 'sick' ? Boolean(isOverflowAbsence) : false,
			overflowReason:
				item.attendanceStatus === 'absent' || item.attendanceStatus === 'sick'
					? overflowReason
					: undefined,
		})
	}

	studentAttendance.attendance = updatedAttendance

	const savedAttendance = await studentAttendanceRepository.saveStudentAttendance(studentAttendance)

	if (!savedAttendance) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error updating attendance.')
	}

	res.status(OK).json(savedAttendance)
})
