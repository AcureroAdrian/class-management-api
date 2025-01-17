'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, CREATED } from '../../utils/http-server-status-codes'
import { shortDaysOfWeek, shortLevels } from '../../utils/short-values'
import { TDaysOfWeek, TUserLevel } from '../../utils/common-types'
import getAgeRangeByMinAndMax from '../../utils/get-age-range-by-min-max'
import getTimeStringByStartTime from '../../utils/get-time-string-by-start-time'
import { logger } from '../../logger'

// @desc    Register karate class
// @route   POST /api/karate-classes/
// @access  Admin
export const registerKarateClass = asyncHandler(async (req: IRequest, res: Response) => {
	const { name, minAge, maxAge, levels, weekDays, students, startTime, description } = req.body

	if (isNaN(minAge)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid minimum age.')
	}
	if (isNaN(maxAge)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid maximum age.')
	}
	if (!levels?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class levels.')
	}
	if (!weekDays?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid week days.')
	}

	let validName = name

	if (!validName) {
		const ageRange = getAgeRangeByMinAndMax(minAge, maxAge)
		const levelsNames = levels.map((level: TUserLevel) => shortLevels[level]).join('&')
		const validSchedule = weekDays.map((day: TDaysOfWeek) => shortDaysOfWeek[day]).join('&')
		const time = getTimeStringByStartTime(startTime.hour, startTime.minute)

		validName = `${ageRange} yo ${levelsNames} / ${validSchedule} ${time}`
	}

	const karateClass = await karateClassRepository.createKarateClass({
		name: validName,
		minAge,
		maxAge,
		levels,
		weekDays,
		startTime,
		description,
		students,
	})

	if (!karateClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating class. Please try again later.')
	}

	logger.log({
		level: 'info',
		message: `Class: ${validName} registered.`,
	})

	res.status(CREATED).json(karateClass)
})
