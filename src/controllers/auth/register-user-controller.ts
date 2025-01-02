'use strict'

import asyncHandler from 'express-async-handler'
import { differenceInYears, isDate } from 'date-fns'
import { Request, Response } from 'express'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../../utils/http-server-status-codes'
import { verifyEmail } from '../../utils/validators/input-validator'
import { generateToken } from '../../utils/token-functions'
import { logger } from '../../logger'

// @desc    Register user && get token to auth
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
	const { email, password, name, lastName, dateOfBirth, level } = req.body

	if (!verifyEmail(email)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid Email Address.')
	}
	if (!password?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid password.')
	}
	if (!name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid name.')
	}
	if (!lastName?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid last name.')
	}
	if (!isDate(new Date(dateOfBirth))) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid date of birth.')
	}
	if (!level?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student level.')
	}

	const existsEmail = await userRepository.findUserByEmail(email)

	if (existsEmail) {
		res.status(BAD_REQUEST)
		throw new Error('Email already exists.')
	}

	const user = await userRepository.createUser({
		email,
		password,
		name,
		lastName,
		dateOfBirth,
		level,
	})

	if (!user) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating user. Please try again later.')
	}

	user.password = user.encryptPassword(password)

	const userUpdated = await userRepository.saveUser(user)

	if (!userUpdated) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error updating user. Please try again later.')
	}

	const age = differenceInYears(new Date(), new Date(user.dateOfBirth))

	const userInfo = {
		_id: user._id,
		avatar: user?.avatar,
		name: user.name,
		lastName: user.lastName,
		email: user.email,
		level: user.level,
		dateOfBirth: user.dateOfBirth,
		age,
		createdAt: user.createdAt,
	}

	logger.log({
		level: 'info',
		message: `${user.name} ${user.lastName} registered.`,
	})

	const token = generateToken(userInfo)

	if (token?.error?.length) {
		res.status(BAD_REQUEST)
		throw new Error(token.error)
	}

	res.status(CREATED).json({ token })
})
