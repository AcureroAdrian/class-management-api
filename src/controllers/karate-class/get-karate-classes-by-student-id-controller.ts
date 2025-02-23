'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Get all karate classes for student id
// @route   GET /api/karate-classes/student/:id
// @access  Admin
export const getKarateClassesByStudentId = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	const classes = await karateClassRepository.findKarateClassesByStudentId(id)

	if (!classes?.length) {
		res.status(NOT_FOUND)
		throw new Error('No classes found.')
	}

	res.status(OK).json(classes)
})
