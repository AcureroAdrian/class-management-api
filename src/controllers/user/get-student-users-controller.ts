'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { getAvailableCreditsForStudent } from '../../utils/credits-service'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all student users
// @route   GET /api/users?mode=teachers|students
// @access  Admin
export const getStudentUsers = asyncHandler(async (req: IRequest, res: Response) => {
	const { mode } = req.query

	const students = await userRepository.findStudentUsers(mode as 'teachers' | 'students')

	if (!students?.length) {
		res.status(NOT_FOUND)
		throw new Error(mode === 'teachers' ? 'No teachers found.' : 'No students found.')
	}

	const studentsWithRecoveryCredits = await Promise.all(
		students.map(async (student) => {
			const info = await getAvailableCreditsForStudent(student._id.toString())
			return {
				...student,
				recoveryCredits: info.totalCredits,
			}
		}),
	)

	res.status(OK).json(studentsWithRecoveryCredits)
})
