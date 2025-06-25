'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all student users
// @route   GET /api/users?mode=teachers|students
// @access  Admin
export const getStudentUsers = asyncHandler(async (req: IRequest, res: Response) => {
	const { mode } = req.query

	const students = await userRepository.findStudentUsers(mode as 'teachers' | 'students')

	if (!students?.length) {
		res.status(NOT_FOUND)
		throw new Error(mode === 'teachers' ? 'No teachers found.' : 'No students found.')
	}

	res.status(OK).json(students)
})
