'use strict'

import asyncHandler from 'express-async-handler'
import { differenceInYears } from 'date-fns'
import { Request, Response } from 'express'
import { verifyEmail } from '../../utils/validators/input-validator'
import * as userRepository from '../../repositories/user-repository'
import { generateToken } from '../../utils/token-functions'
import { BAD_REQUEST, UNAUTHORIZED, OK } from '../../utils/http-server-status-codes'
import { logger } from '../../logger'

// @desc    Auth user && get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
	const { email = '', password = '' } = req.body

	if (!verifyEmail(email)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid Email Address.')
	}

	const user = await userRepository.findUserByEmail(email)

	if (!user) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid Email Address.')
	}

	const isValidPassword = user.validPassword(password)

	if (!isValidPassword) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid Password.')
	}

	if (user.status === 'inactive') {
		res.status(UNAUTHORIZED)
		throw new Error('Your account is inactive.')
	}

	// const age = differenceInYears(new Date(), new Date(user.dateOfBirth))

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
