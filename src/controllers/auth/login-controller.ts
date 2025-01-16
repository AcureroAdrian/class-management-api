'use strict'

import asyncHandler from 'express-async-handler'
import { Request, Response } from 'express'
import * as userRepository from '../../repositories/user-repository'
import { generateToken } from '../../utils/token-functions'
import { BAD_REQUEST, UNAUTHORIZED, OK } from '../../utils/http-server-status-codes'
import { logger } from '../../logger'

// @desc    Auth user && get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
	const { name = '', lastName = '', dateOfBirth } = req.body

	if (!name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid name.')
	}
	if (!lastName?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid last name.')
	}
	if (!dateOfBirth) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid date of birth.')
	}

	const validDateOfBirth = {
		year: new Date(dateOfBirth).getFullYear(),
		month: new Date(dateOfBirth).getMonth() + 1,
		day: new Date(dateOfBirth).getDate(),
	}

	const user = await userRepository.findUserByCredentials(name, lastName, validDateOfBirth)

	if (!user) {
		res.status(BAD_REQUEST)
		throw new Error('User not found.')
	}

	if (user.status === 'inactive') {
		res.status(UNAUTHORIZED)
		throw new Error('Your account is inactive.')
	}

	const userInfo = {
		_id: user._id,
		avatar: user?.avatar,
		name: user.name,
		lastName: user.lastName,
		email: user.email,
		level: user.level,
		dateOfBirth: user.dateOfBirth,
		createdAt: user.createdAt,
	}

	logger.log({
		level: 'info',
		message: `${user.name} ${user.lastName} logged in.`,
	})

	const token = generateToken(userInfo)

	if (token?.error?.length) {
		res.status(BAD_REQUEST)
		throw new Error(token.error)
	}

	res.status(OK).json({ token })
})
