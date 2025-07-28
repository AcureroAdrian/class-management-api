'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { Types } from 'mongoose'
import { IRequest } from '../../middleware/auth-middleware'
import { IKarateClass } from '../../models/KarateClass'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as holidayRepository from '../../repositories/holiday-repository'
import getNameOfWeekDayByDay from '../../utils/get-name-of-week-day-by-day'
import { NOT_FOUND, OK, BAD_REQUEST } from '../../utils/http-server-status-codes'
import { createHoustonDate, getPreviousDayInHouston } from '../../utils/houston-timezone'
import { logger } from '../../logger'

// @desc    Get all student attendances by a specific day
// @route   GET /api/student-attendances?year&month&day
// @access  Admin or Teacher
export const getStudentAttendancesByDay = asyncHandler(async (req: IRequest, res: Response) => {
	logger.info('=== INICIANDO getStudentAttendancesByDay ===')
	logger.info(`Request: ${req.method} ${req.path} - User: ${req.user?._id}`)
	logger.info(`Query params: year=${req.query.year}, month=${req.query.month}, day=${req.query.day}`)

	try {
		// Obtener el día anterior en zona horaria de Houston
		const today = getPreviousDayInHouston()
		const { year, month, day } = req.query
		const validYear = Number(year || 0)
		const validMonth = Number(month || 0)
		const validDay = Number(day || 0)

		logger.info(`Date params: ${validYear}-${validMonth}-${validDay}`)

		// Crear la fecha seleccionada en zona horaria de Houston con hora 00:00:00.000
		const selectedDay = createHoustonDate(validYear, validMonth, validDay)

		logger.info('Buscando student attendance en base de datos...')
		const savedStudentAttendance = await studentAttendanceRepository.findStudentAttendanceByDay(
			validYear,
			validMonth,
			validDay,
		)
		logger.info(`Saved attendance encontrado: ${savedStudentAttendance?.length || 0} registros`)

		if (selectedDay < today && !savedStudentAttendance?.length) {
			logger.warn('No attendance found para fecha pasada')
			res.status(NOT_FOUND)
			throw new Error('No attendance found.')
		}

		// Generate virtual attendances for missing classes
		let virtualAttendances: any[] = []
		if (selectedDay >= today) {
			logger.info('Generando virtual attendances para fecha presente/futura')
			const weekDay = getNameOfWeekDayByDay(selectedDay)
			logger.info(`Week day: ${weekDay}`)

			const validClasses: IKarateClass[] = await karateClassRepository.findKarateClassesByWeekDay(weekDay, {
				year: validYear,
				month: validMonth,
				day: validDay,
			})
			logger.info(`Clases válidas encontradas: ${validClasses?.length || 0}`)

			for (const karateClass of validClasses) {
				const { hour, minute } = karateClass?.startTime || {}
				const existsAttendance = savedStudentAttendance?.find(
					(attendance) =>
						attendance?.date?.hour === hour &&
						attendance?.date?.minute === minute &&
						String(attendance?.karateClass?._id) === String(karateClass?._id),
				)

				if (existsAttendance) {
					logger.info(`Attendance ya existe para clase ${karateClass._id} (${hour}:${minute})`)
					continue
				}

				// Find recovery students for this specific class and day
				const recoveryStudentsOnDate = await recoveryClassRepository.findRecoveryClassByDetails(
					undefined,
					karateClass._id.toString(),
					{ year: validYear, month: validMonth, day: validDay, hour, minute },
				)

				// Combine regular and recovery students
				const regularStudents = karateClass?.students?.map((student) => ({
					student: student,
					attendanceStatus: 'absent',
					observations: '',
					isDayOnly: false,
					isRecovery: false,
				}))

				const recoveryStudents = recoveryStudentsOnDate.map((recovery: any) => ({
					student: recovery.student,
					attendanceStatus: 'absent',
					observations: 'Recovery Class',
					isDayOnly: false,
					isRecovery: true,
				}))

				const allStudentsForClass = [...regularStudents, ...recoveryStudents]

				// Remove duplicates (a student might be in both lists, though unlikely)
				const uniqueStudents = Array.from(new Map(allStudentsForClass.map((s) => [s.student._id.toString(), s])).values())

				// Generate deterministic virtual ID
				const virtualId = `virtual-${karateClass._id}-${validYear}-${validMonth}-${validDay}-${hour}-${minute}`

				const virtualAttendance = {
					_id: virtualId,
					isVirtual: true,
					karateClass: karateClass,
					date: { year: validYear, month: validMonth, day: validDay, hour, minute },
					attendance: uniqueStudents,
					status: 'active',
				}

				virtualAttendances.push(virtualAttendance)
				logger.info(`Virtual attendance creado para clase ${karateClass._id} - Estudiantes: ${uniqueStudents.length} (${regularStudents.length} regulares, ${recoveryStudents.length} recuperación)`)
			}
		}

		logger.info(`Virtual attendances generados: ${virtualAttendances?.length || 0}`)

		// Add isVirtual flag to real attendances for consistency
		const realAttendancesWithFlag = savedStudentAttendance.map((attendance) => ({
			...attendance,
			isVirtual: false,
		}))

		const totalAttendance = [...realAttendancesWithFlag, ...virtualAttendances]
		logger.info(`Total attendance final: ${totalAttendance?.length || 0} (${realAttendancesWithFlag.length} reales, ${virtualAttendances.length} virtuales)`)

		if (!totalAttendance?.length) {
			logger.warn('No attendance found - array vacío')
			res.status(NOT_FOUND)
			throw new Error('No attendance found.')
		}

		const holiday = await holidayRepository.findHolidayByDate(validYear, validMonth, validDay)
		logger.info(`Holiday encontrado: ${holiday ? 'SÍ' : 'NO'}`)

		logger.info('=== RESPUESTA EXITOSA ===')
		
		res.status(OK).json({ attendances: totalAttendance, holiday })
	} catch (error) {
		logger.error('=== ERROR EN getStudentAttendancesByDay ===')
		logger.error(`Error: ${error.message}`)
		logger.error(`Stack: ${error.stack}`)
		throw error
	}
})
