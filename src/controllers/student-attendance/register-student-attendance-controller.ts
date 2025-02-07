'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    POST register student attendance
// @route   POST /api/student-attendances/
// @access  Admin
export const registerStudentAttendance = asyncHandler(async (req: IRequest, res: Response) => {
	const {
		karateClass,
		date: { year, month, day, hour, minute },
		attendance,
	} = req.body

	if (!mongoIdValidator(karateClass)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid karate class id.')
	}
	if (!attendance?.length || !attendance.every((item: any) => mongoIdValidator(item.student))) {
		res.status(BAD_REQUEST)
		throw new Error('Some student ids are invalid.')
	}
	if (!year || !month || !day) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid date.')
	}

	const newStudentAttendance = await studentAttendanceRepository.createStudentAttendance({
		karateClass,
		date: { year, month, day, hour, minute },
		attendance,
	})

	if (!newStudentAttendance) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating students attendance.')
	}

	res.status(OK).json(newStudentAttendance)
})
