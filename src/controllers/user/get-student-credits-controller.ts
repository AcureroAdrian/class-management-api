'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import { getAvailableCreditsForStudent } from '../../utils/credits-service'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'

// @desc    Get student recovery credits
// @route   GET /api/users/:id/credits
// @access  Admin or Student (own credits)
export const getStudentCredits = asyncHandler(async (req: IRequest, res: Response) => {
	const { id: studentId } = req.params
	const requestingUserId = req.user._id.toString()
	const requestingUserRole = (req.user as any).role

	// Allow admin to get any student's credits, or student to get their own credits
	if (requestingUserRole !== 'admin' && requestingUserId !== studentId) {
		res.status(403)
		throw new Error('Not authorized to access this student\'s credits.')
	}

	try {
		const creditsInfo = await getAvailableCreditsForStudent(studentId)
		
		res.status(OK).json({
			studentId,
			totalCredits: creditsInfo.totalCredits, // créditos disponibles
			creditsFromAbsences: creditsInfo.creditsFromAbsences,
			adjustment: creditsInfo.adjustment,
			bookedCount: creditsInfo.bookedCount,
			poolCredits: creditsInfo.poolCredits,
			plan: creditsInfo.plan,
			maxPending: creditsInfo.maxPending,
			isFrozen: creditsInfo.isFrozen,
		})
	} catch (error) {
		res.status(NOT_FOUND)
		throw new Error('Student not found or credits could not be calculated.')
	}
})
