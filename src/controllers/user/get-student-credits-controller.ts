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
	const isAdmin = req.user.isAdmin || req.user.isSuper

	// Allow admin to get any student's credits, or student to get their own credits
	if (!isAdmin && requestingUserId !== studentId) {
		res.status(403)
		throw new Error('Not authorized to access this student\'s credits.')
	}

	try {
		const creditsInfo = await getAvailableCreditsForStudent(studentId)
		
		res.status(OK).json({
			studentId,
			totalCredits: creditsInfo.totalCredits,
			creditsFromAbsences: creditsInfo.creditsFromAbsences,
			adjustment: creditsInfo.adjustment,
			adjustmentTotal: creditsInfo.adjustmentTotal,
			adjustmentUsed: creditsInfo.adjustmentUsed,
			bookedCount: creditsInfo.bookedCount,
			adjustmentBookedCount: creditsInfo.adjustmentBookedCount,
			absencesCount: creditsInfo.absencesCount,
			consumedAbsences: creditsInfo.consumedAbsences,
			pendingAbsences: creditsInfo.pendingAbsences,
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
