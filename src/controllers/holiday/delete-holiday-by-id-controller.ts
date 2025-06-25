'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { differenceInHours } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as holidayRepository from '../../repositories/holiday-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Delete holiday by id
// @route   DELETE /api/holidays/:id
// @access  Admin
export const deleteHolidayById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid holiday id.')
	}

	const holiday = await holidayRepository.findHolidayById(id)

	if (!holiday) {
		res.status(NOT_FOUND)
		throw new Error('Holiday not found.')
	}

	holiday.status = 'deleted'

	const updatedHoliday = await holidayRepository.saveHoliday(holiday)

	if (!updatedHoliday) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error deleting recovery class.')
	}

	res.status(OK).json({ holidayId: id })
})
