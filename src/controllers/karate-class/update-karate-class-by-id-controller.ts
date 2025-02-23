'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import { logger } from '../../logger'

// @desc    PATCH update karate class by id
// @route   PATCH /api/karate-classes/:id
// @access  Admin
export const updateKarateClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const data = req.body
	const { name, minAge, maxAge, levels, weekDays, description, location } = data
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
	if (weekDays && !weekDays?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid week days of the week.')
	}
	if (description && !description?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid description.')
	}
	if (location && !location?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid location.')
	}

	const karateClass = await karateClassRepository.findKarateClassById(karateClassId)

	if (!karateClass) {
		res.status(BAD_REQUEST)
		throw new Error('Class not found.')
	}

	//Class students validation
	if (Boolean(data?.students) || Boolean(data?.startTime) || weekDays || location) {
		const classesInTimeRange = await karateClassRepository.findClassesInTimeRangeAndLocation(
			karateClass.location || 'spring',
			data.startTime.hour || 0,
			data.startTime.minute || 0,
			data.weekDays,
		)

		const anotherClasses = classesInTimeRange?.filter(
			(classInTimeRange) => String(classInTimeRange._id) !== karateClassId,
		)

		if (anotherClasses?.length > 1) {
			res.status(BAD_REQUEST)
			throw new Error(
				`Class cannot be updated because there are already 2 classes for that same day, time and location. Classes: ${anotherClasses?.[0]?.name}, ${anotherClasses?.[1]?.name}.`,
			)
		}

		const [anotherClass] = anotherClasses

		if ((anotherClass?.students || 0) + data.students.length > 40) {
			res.status(BAD_REQUEST)
			throw new Error(
				anotherClass
					? `The number of students for the schedule exceeds 40 students. Class at the same time: ${anotherClass?.name}`
					: 'The number of students for the schedule exceeds 40 students.',
			)
		}
	}

	Object.keys(data).forEach((key) => {
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
