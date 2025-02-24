'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as holidayRepository from '../../repositories/holiday-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    POST register holiday
// @route   POST /api/holidays/
// @access  Admin
export const registerHolidayByDate = asyncHandler(async (req: IRequest, res: Response) => {
	const { year, month, day } = req.body
	const userId = String(req.user._id)

	if (!year || !month || !day) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid date.')
	}

	const existsHoliday = await holidayRepository.findHolidayByDate(year, month, day)

	if (existsHoliday) {
		res.status(BAD_REQUEST)
		throw new Error('Holiday already exists.')
	}

	const newHoliday = await holidayRepository.createHoliday({
		date: {
			year,
			month,
			day,
		},
		user: userId as any,
	})

	if (!newHoliday) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error saving holiday.')
	}

	res.status(OK).json(newHoliday)
})
