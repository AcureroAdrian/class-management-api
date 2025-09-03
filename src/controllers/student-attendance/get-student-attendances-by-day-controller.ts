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

// @desc    Get all student attendances by a specific day
// @route   GET /api/student-attendances?year&month&day
// @access  Admin or Teacher
export const getStudentAttendancesByDay = asyncHandler(async (req: IRequest, res: Response) => {
	// Obtener el día anterior en zona horaria de Houston
	const today = getPreviousDayInHouston()

	const { year, month, day } = req.query
	const validYear = Number(year || 0)
	const validMonth = Number(month || 0)
	const validDay = Number(day || 0)

	// Crear la fecha seleccionada en zona horaria de Houston con hora 00:00:00.000
	const selectedDay = createHoustonDate(validYear, validMonth, validDay)

	const savedStudentAttendance = await studentAttendanceRepository.findStudentAttendanceByDay(
		validYear,
		validMonth,
		validDay,
	)

	// Flag para saber si se sincronizó algún attendance real
	let didSyncAnyAttendance = false

	if (selectedDay < today && !savedStudentAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('No attendance found.')
	}

	// Generate virtual attendances for missing classes
	let virtualAttendances: any[] = []
	console.log('selectedDay', selectedDay)
	console.log('today', today)
	if (selectedDay >= today) {
		const weekDay = getNameOfWeekDayByDay(selectedDay)

		const validClasses: IKarateClass[] = await karateClassRepository.findKarateClassesByWeekDay(weekDay, {
			year: validYear,
			month: validMonth,
			day: validDay,
		})

		for (const karateClass of validClasses) {
			const { hour, minute } = karateClass?.startTime || {}
			const existsAttendance = savedStudentAttendance?.find(
				(attendance) =>
					attendance?.date?.hour === hour &&
					attendance?.date?.minute === minute &&
					String(attendance?.karateClass?._id) === String(karateClass?._id),
			)

			const recoveryStudentsOnDate = await recoveryClassRepository.findRecoveryClassByDetails(
				undefined,
				karateClass._id.toString(),
				{ year: validYear, month: validMonth, day: validDay, hour, minute },
			)


			if (existsAttendance) {
				// Si existe attendance REAL para esta clase/horario, aseguramos que incluya los estudiantes de recuperación del día
				try {
					const realAttendanceDoc = await studentAttendanceRepository.findStudentAttendanceById(
						String(existsAttendance._id),
					)

					if (existsAttendance) {
						let wasModified = false
						for (const rc of recoveryStudentsOnDate) {
							const rcStudentId =
								(rc?.student as any)?. _id?.toString?.() || (rc?.student as any)?.toString?.() || ''

							if (!rcStudentId) continue

							const existingItem = realAttendanceDoc.attendance?.find(
								(item: any) => String(item.student) === rcStudentId,
							)

							if (!existingItem) {
								realAttendanceDoc.attendance.push({
									student: rcStudentId as any,
									attendanceStatus: 'absent' as any,
									isDayOnly: false,
									isRecovery: true,
									recoveryClassId: (rc as any)?._id as any,
								})
								wasModified = true
							} else {
								let changed = false
								if (!existingItem.isRecovery) {
									existingItem.isRecovery = true
									changed = true
								}
								if (!existingItem.recoveryClassId && (rc as any)?._id) {
									existingItem.recoveryClassId = (rc as any)?._id as any
									changed = true
								}
								wasModified = wasModified || changed
							}
						}

						if (wasModified) {
							await studentAttendanceRepository.saveStudentAttendance(realAttendanceDoc)
							didSyncAnyAttendance = true
						}
					}
				} catch (error) {
					// No interrumpir el flujo si falla la sincronización
				}

				// Como ya existe un attendance real, no generamos virtual para esta clase
				continue
			}
			// Find recovery students for this specific class and day
			

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
		}
	}

	// Si se sincronizó algún attendance, refrescamos la consulta para devolver datos actualizados
	if (didSyncAnyAttendance) {
		// eslint-disable-next-line no-var
		var refreshed = await studentAttendanceRepository.findStudentAttendanceByDay(
			validYear,
			validMonth,
			validDay,
		)
		savedStudentAttendance.length = 0
		savedStudentAttendance.push(...refreshed)
	}

	// Add isVirtual flag to real attendances for consistency
	const realAttendancesWithFlag = savedStudentAttendance.map((attendance) => ({
		...attendance,
		isVirtual: false,
	}))

	const totalAttendance = [...realAttendancesWithFlag, ...virtualAttendances]

	if (!totalAttendance?.length) {
		res.status(NOT_FOUND)
		throw new Error('No attendance found.')
	}

	const holiday = await holidayRepository.findHolidayByDate(validYear, validMonth, validDay)

	res.status(OK).json({ attendances: totalAttendance, holiday })
})
