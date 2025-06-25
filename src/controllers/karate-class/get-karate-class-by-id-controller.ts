'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Get karate class by id
// @route   GET /api/karate-classes/:id
// @access  all users
export const getKarateClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class id.')
	}

	const karateClass = await karateClassRepository.findKarateClassById(id)

	if (!karateClass) {
		res.status(NOT_FOUND)
		throw new Error('Class not found.')
	}

	res.status(OK).json(karateClass)
})
