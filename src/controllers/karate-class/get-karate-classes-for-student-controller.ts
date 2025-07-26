'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { differenceInYears } from 'date-fns'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as attendanceRepository from '../../repositories/student-attendance-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as userRepository from '../../repositories/user-repository'
import { NOT_FOUND, OK } from '../../utils/http-server-status-codes'
import { getCurrentDateInHouston } from '../../utils/houston-timezone'

// @desc    Get all karate classes for student
// @route   GET /api/karate-classes/student
// @access  Admin or Student
export const getKarateClassesForStudent = asyncHandler(async (req: IRequest, res: Response) => {
	const userId = String(req.user._id)

	const student = await userRepository.findUserById(userId)

	if (!student) {
		res.status(NOT_FOUND)
		throw new Error('Student not found.')
	}

	const { year, month, day } = student.dateOfBirth
	const age = differenceInYears(new Date(), new Date(year, month - 1, day))

	const karateClassesByProfile = await karateClassRepository.findKarateClassesForStudent(age, student.level, userId)

	// Clases de recuperación
	const absents = await attendanceRepository.findAbsentsByStudentId(userId)
	const activeRecoveryClasses = await recoveryClassRepository.findActiveRecoveryClassesByStudentId(userId)

	// Obtener las clases de las recuperaciones activas
	const recoveryClassIds = activeRecoveryClasses
		.map((recovery) => recovery.karateClass)
		.filter((id) => id)
		.map((id) => id.toString())

	const karateClassesFromRecoveries = await karateClassRepository.findKarateClassesByIds(recoveryClassIds)

	// Combinar las listas de clases y eliminar duplicados
	const allKarateClasses = [...karateClassesByProfile, ...karateClassesFromRecoveries]
	const uniqueKarateClasses = Array.from(new Map(allKarateClasses.map((cls) => [cls._id.toString(), cls])).values())

	if (!uniqueKarateClasses?.length) {
		res.status(NOT_FOUND)
		throw new Error('No classes found.')
	}

	const nowInHouston = getCurrentDateInHouston()

	const response = {
		karateClasses: uniqueKarateClasses.map((karateClass) => {
			// Find all possible recovery classes for this karate class
			const potentialRecoveryClasses = activeRecoveryClasses?.filter(
				(recovery) => String(recovery?.karateClass) === String(karateClass?._id),
			)

			let finalRecoveryClass: any = undefined

			if (potentialRecoveryClasses && potentialRecoveryClasses.length > 0) {
				// Sort them by date to handle multiple bookings for the same class
				const sortedRecoveryClasses = potentialRecoveryClasses.sort((a, b) => {
					const dateA = new Date(a.date.year, a.date.month - 1, a.date.day, a.date.hour, a.date.minute)
					const dateB = new Date(b.date.year, b.date.month - 1, b.date.day, b.date.hour, b.date.minute)
					return dateA.getTime() - dateB.getTime()
				})

				// Find the first valid, upcoming recovery class
				finalRecoveryClass = sortedRecoveryClasses.find((rc) => {
					if (!rc.date) return false
					const recoveryClassDate = new Date(rc.date.year, rc.date.month - 1, rc.date.day, rc.date.hour, rc.date.minute)
					return recoveryClassDate >= nowInHouston
				})
			}

			return {
				...karateClass,
				recoveryClass: finalRecoveryClass,
			}
		}),
		absents,
		recoveryCreditsAdjustment: student.recoveryCreditsAdjustment || 0,
	}

	res.status(OK).json(response)
})
