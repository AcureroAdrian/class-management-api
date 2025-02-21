'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Get all student attendances by a specific day
// @route   GET /api/student-attendances/student-report-admin/:id?startDate=2021-09-01&endDate=2021-09-01&classId=all
// @access  Admin
export const getStudentReportForAdmin = asyncHandler(async (req: IRequest, res: Response) => {
	const { startDate, endDate, classId } = req.query
	const { id } = req.params
	const classIdString = String(classId)

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student.')
	}
	if (classId !== 'all' && !mongoIdValidator(classIdString)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class.')
	}

	const [startYear, startMonth, startDay] = String(startDate)?.split('-').map(Number)
	const [endYear, endMonth, endDay] = String(endDate)?.split('-').map(Number)

	let studentAttendance = await studentAttendanceRepository.findStudentAttendanceByDatesAndStudentId(
		{ year: startYear, month: startMonth, day: startDay },
		{ year: endYear, month: endMonth, day: endDay },
		classIdString,
		id,
	)

	if (!studentAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('This person has no records in this time range.')
	}

	res.status(OK).json(studentAttendance)
})
