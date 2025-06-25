'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { addDays, isAfter, startOfDay } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Delete or schedule deletion of student user by id
// @route   POST /api/users/:id
// @access  Admin
export const deleteStudentUserById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params
	const { scheduledDeletionDate } = req.body

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	const student = await userRepository.findUserById(id)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	// Si hay fecha programada, validar que sea al menos 1 día en el futuro
	if (scheduledDeletionDate) {
		const scheduledDate = new Date(scheduledDeletionDate)
		const minDate = addDays(startOfDay(new Date()), 1)

		if (!isAfter(scheduledDate, minDate)) {
			res.status(BAD_REQUEST)
			throw new Error('Scheduled deletion must be at least 1 day in the future.')
		}

		// Programar eliminación
		student.scheduledDeletionDate = scheduledDate
		const updatedStudent = await userRepository.saveUser(student)

		if (!updatedStudent) {
			res.status(INTERNAL_SERVER_ERROR)
			throw new Error('Error scheduling student deletion.')
		}

		res.status(OK).json({ 
			studentId: id, 
			message: 'Student deletion scheduled successfully',
			scheduledDeletionDate: scheduledDate
		})
	} else {
		// Eliminación inmediata
		student.status = 'deleted'
		const updatedStudent = await userRepository.saveUser(student)

		if (!updatedStudent) {
			res.status(INTERNAL_SERVER_ERROR)
			throw new Error('Error deleting student.')
		}

		res.status(OK).json({ studentId: id, message: 'Student deleted successfully' })
	}
})
