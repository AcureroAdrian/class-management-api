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
	const { userId, name, lastName, dateOfBirth, level, phone, email, notes, isTeacher, isAdmin, enrollmentPlan } = req.body

	if (!userId?.length) {
		res.status(BAD_REQUEST)
		throw new Error('User ID is required.')
	}
	if (userId.length < 6) {
		res.status(BAD_REQUEST)
		throw new Error('User ID must be at least 6 characters long.')
	}
	if (!/^[A-Za-z0-9]+$/.test(userId)) {
		res.status(BAD_REQUEST)
		throw new Error(`User ID ${userId} must contain only letters and numbers.`)
	}
	if (!name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid name.')
	}
	if (!lastName?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid last name.')
	}

	// Check if userId already exists
	const existsUserById = await userRepository.findUserByUserId(userId)
	if (existsUserById) {
		res.status(BAD_REQUEST)
		throw new Error('User ID already exists.')
	}

	// Check if user with same credentials already exists (optional, can be removed if not needed)
	const existsUser = await userRepository.findUserByCredentials(name, lastName, dateOfBirth)
	if (existsUser) {
		res.status(BAD_REQUEST)
		throw new Error('User already exists.')
	}

	if (enrollmentPlan && !['Basic', 'Optimum', 'Plus', 'Advanced'].includes(enrollmentPlan)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid enrollment plan.')
	}

	const newStudent = await userRepository.createUser({
		userId,
		name,
		lastName,
		dateOfBirth,
		level,
		phone,
		email,
		notes,
		isTeacher,
		isAdmin,
		enrollmentPlan,
	} as any)

	if (!newStudent) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating student.')
	}

	res.status(CREATED).json(newStudent)
})
