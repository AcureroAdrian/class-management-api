'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../../utils/http-server-status-codes'
import { IUser } from '../../models/User'
import { logger } from '../../logger'

// @desc    Register student users
// @route   POST /api/users/
// @access  Admin
export const registerStudentUsers = asyncHandler(async (req: IRequest, res: Response) => {
	const { students = [] } = req.body

	if (students.some((student: IUser) => !student?.name)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid name.')
	}
	if (students.some((student: IUser) => !student?.lastName)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid last name.')
	}

	const newStudents = await userRepository.createManyStudents(students)

	if (!newStudents?.length) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating students.')
	}

	newStudents.forEach((student) => {
		logger.log({
			level: 'info',
			message: `Student: ${student.name} ${student.lastName} registered.`,
		})
	})

	res.status(CREATED).json(newStudents)
})
