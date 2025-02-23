'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Delete student user by id
// @route   DELETE /api/users/:id
// @access  Admin
export const deleteStudentUserById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	const student = await userRepository.findUserById(id)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	student.status = 'deleted'

	const updatedStudent = await userRepository.saveUser(student)

	if (!updatedStudent) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error deleting student.')
	}

	res.status(OK).json({ studentId: id })
})
