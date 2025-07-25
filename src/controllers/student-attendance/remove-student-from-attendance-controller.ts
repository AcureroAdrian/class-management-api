'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as userRepository from '../../repositories/user-repository'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Remove student from a specific attendance
// @route   PUT /api/student-attendances/remove-student-from-attendance
// @access  Admin
export const removeStudentFromAttendance = asyncHandler(async (req: IRequest, res: Response) => {
	const { studentId, attendanceId, classId, date } = req.body

	if (!mongoIdValidator(studentId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	let attendance: any
	let newAttendanceId = attendanceId

	if (attendanceId.startsWith('virtual-')) {
		if (!classId || !date) {
			res.status(BAD_REQUEST)
			throw new Error('Class ID and date are required for virtual attendance.')
		}
		if (!mongoIdValidator(classId)) {
			res.status(BAD_REQUEST)
			throw new Error('Invalid class id.')
		}

		const karateClass = await karateClassRepository.findKarateClassById(classId)
		if (!karateClass) {
			res.status(BAD_REQUEST)
			throw new Error('Class not found.')
		}

		const newAttendanceData = {
			karateClass: classId,
			date: date,
			attendance: karateClass.students.map((sId: any) => ({
				student: sId,
				attendanceStatus: 'absent' as any,
				isDayOnly: false,
			})),
			status: 'active' as any,
		}

		const createdAttendance = await studentAttendanceRepository.createStudentAttendance(newAttendanceData)
		if (!createdAttendance) {
			res.status(INTERNAL_SERVER_ERROR)
			throw new Error('Error creating attendance from virtual.')
		}
		attendance = createdAttendance
		newAttendanceId = createdAttendance._id.toString()
	} else {
		if (!mongoIdValidator(attendanceId)) {
			res.status(BAD_REQUEST)
			throw new Error('Invalid attendance id.')
		}
		attendance = await studentAttendanceRepository.findStudentAttendanceById(attendanceId)
		if (!attendance) {
			res.status(BAD_REQUEST)
			throw new Error('Attendance not found.')
		}
	}

	const studentIndex = attendance.attendance.findIndex((item: any) => item.student.toString() === studentId)
	if (studentIndex === -1) {
		res.status(BAD_REQUEST)
		throw new Error('Student not found in this attendance.')
	}

	// Remove student from the attendance array
	attendance.attendance.splice(studentIndex, 1)
	const updatedAttendance = await studentAttendanceRepository.saveStudentAttendance(attendance)

	// Check if this student was a makeup/recovery student to refund the credit
	const karateClassId = attendance.karateClass.toString()
	const attendanceDate = attendance.date

	const recoveryClass = await recoveryClassRepository.findRecoveryClassByDetails(studentId, karateClassId, attendanceDate)

	if (recoveryClass) {
		// This was a makeup student, so we need to process the credit refund.

		// 1. Remove recovery class from karate class's list
		const karateClass = await karateClassRepository.findKarateClassById(karateClassId)
		if (karateClass) {
			karateClass.recoveryClasses =
				karateClass.recoveryClasses?.filter((id) => id.toString() !== recoveryClass._id.toString()) || []
			await karateClassRepository.saveKarateClass(karateClass)
		}

		// 2. If the recovery was not tied to a specific absence, refund a credit
		if (!recoveryClass.attendance) {
			const student = await userRepository.findUserById(studentId)
			if (student) {
				student.recoveryCreditsAdjustment = (student.recoveryCreditsAdjustment || 0) + 1
				await userRepository.saveUser(student)
			}
		}

		// 3. Delete the recovery class record
		await recoveryClassRepository.deleteRecoveryClassById(recoveryClass._id.toString())
	}

	res.status(OK).json(updatedAttendance)
})
