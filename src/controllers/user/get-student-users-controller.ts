'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as userRepository from '../../repositories/user-repository'
import { computeAvailableCreditsFromSnapshot, getMultipleAbsenceSnapshots } from '../../utils/credits-service'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get all student users
// @route   GET /api/users?mode=teachers|students
// @access  Admin
export const getStudentUsers = asyncHandler(async (req: IRequest, res: Response) => {
    const { mode, includeCredits } = req.query

	const students = await userRepository.findStudentUsers(mode as 'teachers' | 'students')

	if (!students?.length) {
		res.status(NOT_FOUND)
		throw new Error(mode === 'teachers' ? 'No teachers found.' : 'No students found.')
	}

	// const shouldIncludeCredits = String(includeCredits || 'false') === 'true'
    const shouldIncludeCredits = true

    if (!shouldIncludeCredits) {
        // Responder rápido sin cálculo pesado
        res.status(OK).json(students)
        return
    }

	const studentIds = students.map((student) => student._id.toString())
	const snapshotsByStudent = await getMultipleAbsenceSnapshots(studentIds)

	const studentsWithRecoveryCredits = students.map((student) => {
		const snapshot = snapshotsByStudent.get(student._id.toString())
		const info = computeAvailableCreditsFromSnapshot(student as any, snapshot)
		return {
			...student,
			recoveryCredits: info.totalCredits,
		}
	})

    res.status(OK).json(studentsWithRecoveryCredits)
})
