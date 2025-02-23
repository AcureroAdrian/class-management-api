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
	const { name, lastName, dateOfBirth, level, phone, email, notes, isTeacher } = req.body

	if (!name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid name.')
	}
	if (!lastName?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid last name.')
	}

	const newStudent = await userRepository.createUser({
		name,
		lastName,
		dateOfBirth,
		level,
		phone,
		email,
		notes,
		isTeacher,
	})

	if (!newStudent) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating student.')
	}

	res.status(CREATED).json(newStudent)
})
