'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Get all student attendances by a specific day
// @route   GET /api/student-attendances/class-report-admin/:id?startDate=2021-09-01&endDate=2021-09-01
// @access  Admin
export const getClassReportByClassIdForAdmin = asyncHandler(async (req: IRequest, res: Response) => {
	const { startDate, endDate } = req.query
	const { id } = req.params

	if (id !== 'all' && !mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class.')
	}

	const [startYear, startMonth, startDay] = String(startDate)?.split('-').map(Number)
	const [endYear, endMonth, endDay] = String(endDate)?.split('-').map(Number)

	let studentAttendance: any[]

	if (id === 'all') {
		studentAttendance = await studentAttendanceRepository.findStudentAttendanceInAllClassesAndDates(
			{ year: startYear, month: startMonth, day: startDay },
			{ year: endYear, month: endMonth, day: endDay },
		)
	} else {
		studentAttendance = await studentAttendanceRepository.findStudentAttendanceByClassAndDates(
			{ year: startYear, month: startMonth, day: startDay },
			{ year: endYear, month: endMonth, day: endDay },
			id,
		)
	}

	if (!studentAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('This class has no records in this time range.')
	}

	res.status(OK).json(studentAttendance)
})
