'use strict'

jest.mock('../../repositories/student-attendance-repository', () => ({
	findStudentAttendanceById: jest.fn(),
	saveStudentAttendance: jest.fn(),
}))
jest.mock('../../repositories/user-repository', () => ({
	findUsersByIds: jest.fn(),
}))
jest.mock('../../utils/credits-service', () => ({
	getMultipleAbsenceSnapshots: jest.fn(),
	getMaxPendingForPlan: jest.fn().mockReturnValue(2),
	getPendingAbsencesBeforeAttendanceUpdate: jest.fn(),
	shouldOverflowNewAbsence: jest.fn((pendingAbsences: number, planMax: number) => pendingAbsences >= planMax),
}))

import '../../test-helpers/mockTimezone'
import { updateStudentAttendanceById } from '../../controllers/student-attendance/update-student-attendance-by-id-controller'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as userRepository from '../../repositories/user-repository'
import {
	getMultipleAbsenceSnapshots,
	getPendingAbsencesBeforeAttendanceUpdate,
} from '../../utils/credits-service'
import { mockReqRes } from '../../test-helpers/mockReqRes'

describe('update-student-attendance controller', () => {
	beforeEach(() => jest.clearAllMocks())

	test('limpia overflow previo cuando la ausencia editada ya no excede el plan', async () => {
		const attendanceId = '507f1f77bcf86cd7994390aa'
		const studentId = '507f1f77bcf86cd799439012'
		const attendanceDate = { year: 2026, month: 6, day: 20, hour: 9, minute: 30 }
		const previousAttendance = {
			student: studentId,
			attendanceStatus: 'absent',
			isDayOnly: false,
			isRecovery: false,
			isOverflowAbsence: true,
			overflowReason: 'plan-cap',
		}
		const attendanceDoc = {
			_id: attendanceId,
			date: attendanceDate,
			attendance: [previousAttendance],
		}

		;(studentAttendanceRepository.findStudentAttendanceById as any).mockResolvedValue(attendanceDoc)
		;(studentAttendanceRepository.saveStudentAttendance as any).mockImplementation(async (doc: any) => doc)
		;(userRepository.findUsersByIds as any).mockResolvedValue([
			{ _id: studentId, enrollmentPlan: 'Basic', status: 'active', isTrial: false },
		])
		;(getMultipleAbsenceSnapshots as any).mockResolvedValue(
			new Map([[studentId, { absencesCount: 1, bookedCount: 0, consumedAbsences: 0, pendingAbsences: 1, adjustmentBookedCount: 0 }]]),
		)
		;(getPendingAbsencesBeforeAttendanceUpdate as any).mockReturnValue(1)

		const { req, res, next } = mockReqRes(
			{
				attendance: [
					{
						student: studentId,
						attendanceStatus: 'absent',
						isDayOnly: false,
						isRecovery: false,
					},
				],
			},
			{ id: attendanceId },
		)

		await updateStudentAttendanceById(req as any, res as any, next as any)

		const savedDoc = (studentAttendanceRepository.saveStudentAttendance as any).mock.calls[0][0]
		expect(savedDoc.attendance[0].isOverflowAbsence).toBe(false)
		expect(savedDoc.attendance[0].overflowReason).toBeUndefined()
		expect(getPendingAbsencesBeforeAttendanceUpdate).toHaveBeenCalledWith(
			expect.any(Object),
			previousAttendance,
			attendanceDate,
		)
		expect(res.status).toHaveBeenCalledWith(200)
	})

	test('marca overflow cuando una ausencia nueva supera el limite del plan', async () => {
		const attendanceId = '507f1f77bcf86cd7994390ab'
		const studentId = '507f1f77bcf86cd799439013'
		const attendanceDate = { year: 2026, month: 6, day: 21, hour: 9, minute: 30 }
		const attendanceDoc = {
			_id: attendanceId,
			date: attendanceDate,
			attendance: [{ student: studentId, attendanceStatus: 'present' }],
		}

		;(studentAttendanceRepository.findStudentAttendanceById as any).mockResolvedValue(attendanceDoc)
		;(studentAttendanceRepository.saveStudentAttendance as any).mockImplementation(async (doc: any) => doc)
		;(userRepository.findUsersByIds as any).mockResolvedValue([
			{ _id: studentId, enrollmentPlan: 'Basic', status: 'active', isTrial: false },
		])
		;(getMultipleAbsenceSnapshots as any).mockResolvedValue(
			new Map([[studentId, { absencesCount: 2, bookedCount: 0, consumedAbsences: 0, pendingAbsences: 2, adjustmentBookedCount: 0 }]]),
		)
		;(getPendingAbsencesBeforeAttendanceUpdate as any).mockReturnValue(2)

		const { req, res, next } = mockReqRes(
			{
				attendance: [
					{
						student: studentId,
						attendanceStatus: 'absent',
						isDayOnly: false,
						isRecovery: false,
					},
				],
			},
			{ id: attendanceId },
		)

		await updateStudentAttendanceById(req as any, res as any, next as any)

		const savedDoc = (studentAttendanceRepository.saveStudentAttendance as any).mock.calls[0][0]
		expect(savedDoc.attendance[0].isOverflowAbsence).toBe(true)
		expect(savedDoc.attendance[0].overflowReason).toBe('plan-cap')
		expect(res.status).toHaveBeenCalledWith(200)
	})
})
