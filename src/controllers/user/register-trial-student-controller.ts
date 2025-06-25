'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../../utils/http-server-status-codes'
import { logger } from '../../logger'

// @desc    Register trial student with minimal data
// @route   POST /api/users/trial-student
// @access  Admin
export const registerTrialStudent = asyncHandler(async (req: IRequest, res: Response) => {
	const { name, lastName, userId, dateOfBirth, level, phone, email, notes } = req.body

	if (!name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Name is required.')
	}
	if (!lastName?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Last name is required.')
	}

	// Check if userId exists if provided
	if (userId) {
		if (userId.length < 6) {
			res.status(BAD_REQUEST)
			throw new Error('User ID must be at least 6 characters long.')
		}
		if (!/^[A-Za-z0-9]+$/.test(userId)) {
			res.status(BAD_REQUEST)
			throw new Error(`User ID ${userId} must contain only letters and numbers.`)
		}

		const existsUserById = await userRepository.findUserByUserId(userId)
		if (existsUserById) {
			res.status(BAD_REQUEST)
			throw new Error('User ID already exists.')
		}
	}

	const newTrialStudent = await userRepository.createUser({
		userId,
		name,
		lastName,
		dateOfBirth,
		level,
		phone,
		email,
		notes,
		isTrial: true,
		isTeacher: false,
		isAdmin: false,
	})

	if (!newTrialStudent) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating trial student.')
	}

	logger.log({
		level: 'info',
		message: `Trial student: ${name} ${lastName} created.`,
	})

	res.status(CREATED).json(newTrialStudent)
}) 