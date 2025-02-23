'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { differenceInYears } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as userRepository from '../../repositories/user-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all karate classes for student
// @route   GET /api/karate-classes/student
// @access  Admin
export const getKarateClassesForStudent = asyncHandler(async (req: IRequest, res: Response) => {
	const userId = String(req.user._id)

	const student = await userRepository.findUserById(userId)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	const { year, month, day } = student.dateOfBirth
	const age = differenceInYears(new Date(), new Date(year, month - 1, day))

	const classes = await karateClassRepository.findKarateClassesForStudent(age, student.level)

	if (!classes?.length) {
		res.status(NOT_FOUND)
		throw new Error('No classes found.')
	}

	res.status(OK).json(classes)
})
