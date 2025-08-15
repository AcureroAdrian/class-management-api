'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Get student user by id
// @route   GET /api/users/:id
// @access  Admin
export const getStudentUserById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	const student = await userRepository.findUserById(id)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	const absents = await studentAttendanceRepository.findAbsentsByStudentId(id, { onlyUnbooked: true })
	const totalRecoveryCredits = (absents?.length || 0) + (student.recoveryCreditsAdjustment || 0)

	const studentData = {
		...student.toObject(),
		totalRecoveryCredits,
	}

	res.status(OK).json(studentData)
})
