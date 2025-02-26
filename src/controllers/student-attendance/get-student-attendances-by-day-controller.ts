'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import { IKarateClass } from '../../models/KarateClass'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as holidayRepository from '../../repositories/holiday-repository'
import getNameOfWeekDayByDay from '../../utils/get-name-of-week-day-by-day'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { subDays } from 'date-fns'

// @desc    Get all student attendances by a specific day
// @route   GET /api/student-attendances/
// @access  Admin
export const getStudentAttendancesByDay = asyncHandler(async (req: IRequest, res: Response) => {
	const today = subDays(new Date(), 1)
	today.setHours(23, 0, 0, 0)
	const { year, month, day } = req.query
	const validYear = Number(year || 0)
	const validMonth = Number(month || 0)
	const validDay = Number(day || 0)

	const selectedDay = new Date(validYear, validMonth - 1, validDay)

	const savedStudentAttendance = await studentAttendanceRepository.findStudentAttendanceByDay(
		validYear,
		validMonth,
		validDay,
	)

	if (selectedDay < today && !savedStudentAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('No attendance found.')
	}

	let additionalAttendance: any[] = []
	if (selectedDay > today) {
		const weekDay = getNameOfWeekDayByDay(selectedDay)

		const validClasses: IKarateClass[] = await karateClassRepository.findKarateClassesByWeekDay(weekDay, {
			year: validYear,
			month: validMonth,
			day: validDay,
		})

		validClasses.forEach((karateClass) => {
			const { hour, minute } = karateClass?.startTime
			const existsAttendance = savedStudentAttendance?.find(
				(attendance) =>
					attendance?.date?.hour === hour &&
					attendance?.date?.minute === minute &&
					String(attendance?.karateClass?._id) === String(karateClass?._id),
			)

			if (existsAttendance) return

			additionalAttendance.push({
				karateClass: karateClass,
				date: {
					year: validYear,
					month: validMonth,
					day: validDay,
					hour,
					minute,
				},
				attendance: [],
				status: 'active',
				students: karateClass?.students,
			})
		})
	}

	const totalAttendance = [...savedStudentAttendance, ...additionalAttendance]

	if (!totalAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('No attendance found.')
	}

	const holiday = await holidayRepository.findHolidayByDate(validYear, validMonth, validDay)

	res.status(OK).json({ attendances: totalAttendance, holiday })
})
