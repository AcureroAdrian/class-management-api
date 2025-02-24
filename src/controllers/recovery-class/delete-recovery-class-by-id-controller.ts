'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { differenceInHours } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Delete recovery class by id
// @route   DELETE /api/recovery-classes/:id
// @access  Student
export const deleteRecoveryClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params
	const hoursLimitToDelete = 6

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid recovery class id.')
	}

	const recoveryClass = await recoveryClassRepository.findRecoveryClassById(id)

	if (!recoveryClass) {
		res.status(NOT_FOUND)
		throw new Error('Recovery class not found.')
	}

	//TIME VALIDATION
	const now = new Date()
	const recoveryDate = new Date(
		recoveryClass.date.year,
		recoveryClass.date.month - 1,
		recoveryClass.date.day,
		recoveryClass.date.hour,
		recoveryClass.date.minute,
	)
	const hours = differenceInHours(recoveryDate, now)

	if (hours < hoursLimitToDelete) {
		res.status(BAD_REQUEST)
		throw new Error(`You have exceeded the time limit (${hoursLimitToDelete}h) to delete a recovery class reservation.`)
	}

	recoveryClass.status = 'deleted'

	const updatedRecoveryClass = await recoveryClassRepository.saveRecoveryClass(recoveryClass)

	if (!updatedRecoveryClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error deleting recovery class.')
	}

	res.status(OK).json({ recoveryClassId: id })
})
