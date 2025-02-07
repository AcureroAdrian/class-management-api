'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    PATCH update student attendance by id
// @route   PATCH /api/student-attendances/:id
// @access  Admin
export const updateStudentAttendanceById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params
	const { attendance } = req.body

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student attendance id.')
	}
	if (!attendance?.length || !attendance.every((item: any) => mongoIdValidator(item.student))) {
		res.status(BAD_REQUEST)
		throw new Error('Some student ids are invalid.')
	}

	const studentAttendance = await studentAttendanceRepository.findStudentAttendanceById(id)

	if (!studentAttendance) {
		res.status(NOT_FOUND)
		throw new Error('Student attendance not found.')
	}

	studentAttendance.attendance = attendance

	const studentAttendanceUpdated = await studentAttendanceRepository.saveStudentAttendance(studentAttendance)

	if (!studentAttendanceUpdated) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error updating student attendance.')
	}

	res.status(OK).json(studentAttendanceUpdated)
})
