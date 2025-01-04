'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import { logger } from '../../logger'

// @desc    Update karate class by id
// @route   PATCH /api/karate-classes/:id
// @access  Admin
export const updateKarateClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const data = req.body
	const { name, minAge, maxAge, levels, schedule, description } = data
	const { id: karateClassId } = req.params

	if (!mongoIdValidator(karateClassId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class id.')
	}

	if (name && !name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class name.')
	}
	if (minAge && isNaN(minAge)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid minimum age.')
	}
	if (maxAge && isNaN(maxAge)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid maximum age.')
	}
	if (levels && !levels?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class levels.')
	}
	if (schedule && !schedule?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid schedule.')
	}
	if (description && !description?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid description.')
	}

	const karateClass = await karateClassRepository.findKarateClassById(karateClassId)

	if (!karateClass) {
		res.status(BAD_REQUEST)
		throw new Error('Class not found.')
	}

	Object.keys(data).forEach((key) => {
		if (!data[key]) return

		karateClass[key] = data[key] //FIXED
	})

	const updatedKarateClass = await karateClassRepository.saveKarateClass(karateClass)

	if (!updatedKarateClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Failed to update class.')
	}

	logger.log({
		level: 'info',
		message: `Class: ${karateClass?.name} updated.`,
	})

	res.status(OK).json(updatedKarateClass)
})
