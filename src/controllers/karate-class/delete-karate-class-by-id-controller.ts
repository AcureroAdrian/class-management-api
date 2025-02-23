'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Delete karate class by id
// @route   DELETE /api/karate-classes/:id
// @access  Admin
export const deleteKarateClassById = asyncHandler(async (req: IRequest, res: Response) => {
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

	karateClass.status = 'deleted'

	const updatedKarateClass = await karateClassRepository.saveKarateClass(karateClass)

	if (!updatedKarateClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error deleting class.')
	}

	res.status(OK).json({ karateClassId: id })
})
