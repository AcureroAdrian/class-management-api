'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import { logger } from '../../logger'

// @desc    Adjust recovery credits for a student
// @route   POST /api/users/:id/adjust-credits
// @access  Admin
export const adjustRecoveryCredits = asyncHandler(async (req: IRequest, res: Response) => {
	const { id: studentId } = req.params
	const { adjustment } = req.body

	if (!mongoIdValidator(studentId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	if (!adjustment || (adjustment !== 1 && adjustment !== -1)) {
		res.status(BAD_REQUEST)
		throw new Error('Adjustment must be 1 or -1.')
	}

	const student = await userRepository.findUserById(studentId)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	if (adjustment === -1) {
		const absents = await studentAttendanceRepository.findAbsentsByStudentId(studentId, { onlyUnbooked: true })
		const totalRecoveryCredits = (absents?.length || 0) + (student.recoveryCreditsAdjustment || 0)

		if (totalRecoveryCredits <= 0) {
			res.status(BAD_REQUEST)
			throw new Error('Student has no recovery credits to remove.')
		}
	}

	student.recoveryCreditsAdjustment = (student.recoveryCreditsAdjustment || 0) + adjustment

	const updatedStudent = await userRepository.saveUser(student)

	if (!updatedStudent) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Failed to update student credits.')
	}

	logger.log({
		level: 'info',
		message: `Recovery credits for student ${student.name} ${student.lastName} adjusted by ${adjustment}. New adjustment value: ${updatedStudent.recoveryCreditsAdjustment}`,
	})

	const absents = await studentAttendanceRepository.findAbsentsByStudentId(studentId, { onlyUnbooked: true })
	const totalRecoveryCredits = (absents?.length || 0) + (updatedStudent.recoveryCreditsAdjustment || 0)

	const studentData = {
		...updatedStudent.toObject(),
		totalRecoveryCredits,
	}

	res.status(OK).json(studentData)
}) 