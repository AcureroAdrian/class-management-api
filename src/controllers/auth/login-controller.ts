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
	const { userId = '' } = req.body

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

	const user = await userRepository.findUserByUserId(userId)

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
		userId: user.userId,
		avatar: user?.avatar,
		name: user.name,
		lastName: user.lastName,
		email: user.email,
		enrollmentPlan: user.enrollmentPlan,
		level: user.level,
		dateOfBirth: user.dateOfBirth,
		createdAt: user.createdAt,
		isSuper: Boolean(user.isSuper),
		isAdmin: Boolean(user.isAdmin),
		isTeacher: Boolean(user.isTeacher),
	}

	logger.log({
		level: 'info',
		message: `${user.name} ${user.lastName} (${user.userId}) logged in.`,
	})

	const token = generateToken(userInfo)

	if (typeof token === 'object' && 'error' in token && token.error?.length) {
		res.status(BAD_REQUEST)
		throw new Error(token.error)
	}

	res.status(OK).json({ token })
})
