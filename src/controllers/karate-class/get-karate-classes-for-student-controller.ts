'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { differenceInYears, format, subDays } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as attendanceRepository from '../../repositories/student-attendance-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as userRepository from '../../repositories/user-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all karate classes for student
// @route   GET /api/karate-classes/student
// @access  Admin
export const getKarateClassesForStudent = asyncHandler(async (req: IRequest, res: Response) => {
	const userId = String(req.user._id)

	const student = await userRepository.findUserById(userId)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	const { year, month, day } = student.dateOfBirth
	const age = differenceInYears(new Date(), new Date(year, month - 1, day))

	const karateClasses = await karateClassRepository.findKarateClassesForStudent(age, student.level, userId)

	if (!karateClasses?.length) {
		res.status(NOT_FOUND)
		throw new Error('No classes found.')
	}

	// Clases de recuperación
	const absents = await attendanceRepository.findAbsentsByStudentId(userId)
	const activeRecoveryClasses = await recoveryClassRepository.findActiveRecoveryClassesByStudentId(userId)

	const response = {
		karateClasses: karateClasses.map((karateClass) => {
			const recoveryClass = activeRecoveryClasses?.find(
				(recovery) => String(recovery?.karateClass) === String(karateClass?._id),
			)
			return {
				...karateClass,
				recoveryClass,
			}
		}),
		absents,
		recoveryCreditsAdjustment: student.recoveryCreditsAdjustment || 0,
	}

	// Guardar el response en un archivo debug-totalAttendance.json
	const fs = require('fs');
	const path = require('path');
	const debugPath = path.join(__dirname, '../../../debug-totalAttendance.json');
	fs.writeFileSync(debugPath, JSON.stringify({ totalAttendance: response }, null, 2), 'utf8');

	res.status(OK).json(response)
})
