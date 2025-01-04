'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all karate classes
// @route   GET /api/karate-classes/
// @access  Admin
export const getKarateClasses = asyncHandler(async (req: IRequest, res: Response) => {
	const classes = await karateClassRepository.findKarateClasses()

	if (!classes?.length) {
		res.status(NOT_FOUND)
		throw new Error('No classes found.')
	}

	res.status(OK).json(classes)
})
