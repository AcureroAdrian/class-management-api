'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import { RecoveryClass } from '../../models/RecoveryClass'

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
		throw new Error('Invalid class id.')
	}

	if (!attendance?.length || !attendance.every((item: any) => mongoIdValidator(item.student))) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid attendance data.')
	}

	if (!year || !month || !day || !hour || typeof minute !== 'number') {
		res.status(BAD_REQUEST)
		throw new Error('Invalid date.')
	}

	// If creating real attendance from virtual and there are recovery students without recoveryClassId,
	// we need to find and assign the correct recoveryClassId from active recovery classes
	const attendanceWithRecoveryIds = await Promise.all(
		attendance.map(async (item: any) => {
			if (item.isRecovery && !item.recoveryClassId) {
				// Find active recovery class for this student, date, and karate class
				const activeRecoveryClass = await RecoveryClass.findOne({
					student: item.student,
					karateClass: karateClass,
					'date.year': year,
					'date.month': month,
					'date.day': day,
					status: 'active'
				})

				if (activeRecoveryClass) {
					return {
						...item,
						recoveryClassId: activeRecoveryClass._id
					}
				}
			}
			return item
		})
	)

	const newStudentAttendance = await studentAttendanceRepository.createStudentAttendance({
		karateClass,
		date: { year, month, day, hour, minute },
		attendance: attendanceWithRecoveryIds,
	})

	if (!newStudentAttendance) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating students attendance.')
	}

	res.status(OK).json(newStudentAttendance)
})
