'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import { StudentAttendance } from '../../models/StudentAttendance'
import { RecoveryClass } from '../../models/RecoveryClass'
import { Holiday } from '../../models/Holiday'
import { KarateClass } from '../../models/KarateClass'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { logger } from '../../logger'

// @desc    Reset entire attendance system
// @route   POST /api/system/reset-attendance-system
// @access  Super Admin Only
export const resetAttendanceSystem = asyncHandler(async (req: IRequest, res: Response) => {
	const { confirmationText } = req.body
	const REQUIRED_CONFIRMATION = 'RESET ATTENDANCE SYSTEM'

	// Validate confirmation text
	if (confirmationText !== REQUIRED_CONFIRMATION) {
		res.status(BAD_REQUEST)
		throw new Error(`Confirmation text must be exactly: "${REQUIRED_CONFIRMATION}"`)
	}

	try {
		// Get counts before deletion for logging
		const studentAttendanceCount = await StudentAttendance.countDocuments()
		const recoveryClassCount = await RecoveryClass.countDocuments()
		const holidayCount = await Holiday.countDocuments()
		const karateClassesWithRecovery = await KarateClass.countDocuments({ 
			recoveryClasses: { $exists: true, $not: { $size: 0 } } 
		})

		// Start the reset process
		logger.log({
			level: 'warn',
			message: `ATTENDANCE SYSTEM RESET INITIATED by ${req.user?.name} ${req.user?.lastName} (${req.user?.userId}). Counts before deletion: StudentAttendance: ${studentAttendanceCount}, RecoveryClass: ${recoveryClassCount}, Holiday: ${holidayCount}, KarateClasses with recoveries: ${karateClassesWithRecovery}`,
		})

		// Delete all student attendances
		const deletedAttendances = await StudentAttendance.deleteMany({})
		
		// Delete all recovery classes
		const deletedRecoveryClasses = await RecoveryClass.deleteMany({})
		
		// Delete all holidays
		const deletedHolidays = await Holiday.deleteMany({})
		
		// Clear recovery classes arrays from all karate classes
		const updatedKarateClasses = await KarateClass.updateMany(
			{}, 
			{ $set: { recoveryClasses: [] } }
		)

		// Log successful reset
		logger.log({
			level: 'warn',
			message: `ATTENDANCE SYSTEM RESET COMPLETED by ${req.user?.name} ${req.user?.lastName} (${req.user?.userId}). Results: StudentAttendance deleted: ${deletedAttendances.deletedCount}, RecoveryClass deleted: ${deletedRecoveryClasses.deletedCount}, Holiday deleted: ${deletedHolidays.deletedCount}, KarateClasses updated: ${updatedKarateClasses.modifiedCount}`,
		})

		res.status(OK).json({
			message: 'Attendance system reset completed successfully',
			results: {
				studentAttendancesDeleted: deletedAttendances.deletedCount,
				recoveryClassesDeleted: deletedRecoveryClasses.deletedCount,
				holidaysDeleted: deletedHolidays.deletedCount,
				karateClassesUpdated: updatedKarateClasses.modifiedCount
			}
		})

	} catch (error) {
		logger.log({
			level: 'error',
			message: `ATTENDANCE SYSTEM RESET FAILED by ${req.user?.name} ${req.user?.lastName} (${req.user?.userId}). Error: ${error}`,
		})
		
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Failed to reset attendance system. Please try again.')
	}
}) 