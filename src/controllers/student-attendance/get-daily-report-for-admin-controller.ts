'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all student attendances by a specific day
// @route   GET /api/student-attendances/daily-report-admin?startDate=2021-09-01&endDate=2021-09-01
// @access  Admin
export const getDailyReportForAdmin = asyncHandler(async (req: IRequest, res: Response) => {
	const { startDate, endDate } = req.query

	const [startYear, startMonth, startDay] = String(startDate)?.split('-').map(Number)
	const [endYear, endMonth, endDay] = String(endDate)?.split('-').map(Number)

	const studentAttendance = await studentAttendanceRepository.findStudentAttendanceByDates(
		{ year: startYear, month: startMonth, day: startDay },
		{ year: endYear, month: endMonth, day: endDay },
	)

	if (!studentAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('Has no records in this time range.')
	}

	res.status(OK).json(studentAttendance)
})
