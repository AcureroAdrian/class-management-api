'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { getAvailableCreditsForStudent } from '../../utils/credits-service'
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

	const creditsInfo = await getAvailableCreditsForStudent(id)

	const studentData = {
		...student.toObject(),
		totalRecoveryCredits: creditsInfo.totalCredits,
	}

	res.status(OK).json(studentData)
})
