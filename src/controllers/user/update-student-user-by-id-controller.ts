'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { isDate } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator, verifyEmail } from '../../utils/validators/input-validator'
import { shortLevels } from '../../utils/short-values'
import { TUserLevel } from '../../utils/common-types'
import { logger } from '../../logger'

// @desc    Update student user by id
// @route   PATCH /api/users/:id
// @access  Admin
export const updateStudentuserById = asyncHandler(async (req: IRequest, res: Response) => {
	const data = req.body
	const { name, lastName, dateOfBirth, level, email, avatar } = data
	const { id: studentId } = req.params

	if (!mongoIdValidator(studentId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	if (name && !name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student name.')
	}
	if (lastName && !lastName?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student last name.')
	}
	if (dateOfBirth && !isDate(new Date(dateOfBirth))) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid date of birth.')
	}
	if (level && !shortLevels[level as TUserLevel]) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student level.')
	}
	if (email && !verifyEmail(email)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid email address.')
	}
	if (avatar && !avatar?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid avatar.')
	}

	const existsEmail = await userRepository.findUserByEmail(email)

	if (existsEmail) {
		res.status(BAD_REQUEST)
		throw new Error('Email already exists.')
	}

	const student = await userRepository.findUserById(studentId)

	if (!student) {
		res.status(BAD_REQUEST)
		throw new Error('Student not found.')
	}

	Object.keys(data).forEach((key) => {
		if (!data[key]) return

		student[key] = data[key] //FIXED
	})

	const updatedStudent = await userRepository.saveUser(student)

	if (!updatedStudent) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Failed to update student.')
	}

	logger.log({
		level: 'info',
		message: `Student: ${student?.name} updated.`,
	})

	res.status(OK).json(updatedStudent)
})
