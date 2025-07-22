'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { differenceInHours } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Delete recovery class by id
// @route   DELETE /api/recovery-classes/:id
// @access  Student
export const deleteRecoveryClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params
	const hoursLimitToDelete = 24

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid recovery class id.')
	}

	const recoveryClass = await recoveryClassRepository.findRecoveryClassById(id)

	if (!recoveryClass) {
		res.status(BAD_REQUEST)
		throw new Error('Recovery class not found')
	}

	const recoveryDate = new Date(
		recoveryClass.date.year,
		recoveryClass.date.month - 1,
		recoveryClass.date.day,
		recoveryClass.date.hour,
		recoveryClass.date.minute,
	)

	const now = new Date()
	const diffInMs = recoveryDate.getTime() - now.getTime()
	const hoursUntilClass = diffInMs / (1000 * 60 * 60)

	if (hoursUntilClass < hoursLimitToDelete) {
		res.status(BAD_REQUEST)
		throw new Error(`You can only cancel a recovery class ${hoursLimitToDelete} hours before the class starts.`)
	}

	recoveryClass.status = 'deleted'

	const recoveryClassDeleted = await recoveryClassRepository.saveRecoveryClass(recoveryClass)

	if (!recoveryClassDeleted) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error deleting recovery class.')
	}

	// Refund credit if it was a manual credit
	if (!recoveryClass.attendance) {
		const student = await userRepository.findUserById(String(recoveryClass.student))
		if (student) {
			student.recoveryCreditsAdjustment = (student.recoveryCreditsAdjustment || 0) + 1
			await userRepository.saveUser(student)
		}
	}

	// Try to sync with real attendance if it exists
	try {
		await studentAttendanceRepository.syncRecoveryWithRealAttendance(
			'remove',
			recoveryClass,
			recoveryClass.student,
			recoveryClass.karateClass,
			recoveryClass.date
		)
	} catch (error) {
		// Don't fail the deletion if sync fails
	}

	res.status(OK).json({ recoveryClassId: id })
})
