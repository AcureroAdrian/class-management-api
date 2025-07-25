'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as holidayRepository from '../../repositories/holiday-repository'
import { INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Public
export const getAllHolidays = asyncHandler(async (req: IRequest, res: Response) => {
	const holidays = await holidayRepository.getAllHolidays()

	if (!holidays) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error getting holidays.')
	}

	res.status(OK).json(holidays)
}) 