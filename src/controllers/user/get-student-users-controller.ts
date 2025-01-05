'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all student users
// @route   GET /api/users/
// @access  Admin
export const getStudentUsers = asyncHandler(async (req: IRequest, res: Response) => {
	const students = await userRepository.findStudentUsers()

	if (!students?.length) {
		res.status(NOT_FOUND)
		throw new Error('No students found.')
	}

	res.status(OK).json(students)
})
