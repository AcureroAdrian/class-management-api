'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as userRepository from '../../repositories/user-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import { Types } from 'mongoose'
import { locationCapacityLimits } from '../../utils/short-values'

// @desc    Booking recovery karate class by id
// @route   PUT /api/karate-classes/recovery-class/:id
// @access  Student
export const bookingRecoveryClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const { id } = req.params
	const { studentId, attendanceId, date } = req.body

	if (!mongoIdValidator(id)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class id.')
	}
	if (!mongoIdValidator(studentId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}
	if (attendanceId && !mongoIdValidator(attendanceId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid absentence.')
	}

	if (!attendanceId) {
		const student = await userRepository.findUserById(studentId)
		const absents = await studentAttendanceRepository.findAbsentsByStudentId(studentId)
		const totalRecoveryCredits = (absents?.length || 0) + (student.recoveryCreditsAdjustment || 0)
		if (!student || totalRecoveryCredits <= 0) {
			res.status(BAD_REQUEST)
			throw new Error('Student has no recovery credits.')
		}
	}

	const karateClass = await karateClassRepository.findKarateClassById(id)

	//Class students validation
	const classesInTimeRange = await karateClassRepository.findClassesInTimeRangeAndLocation(
		karateClass?.location || 'spring',
		karateClass?.startTime?.hour || 0,
		karateClass?.startTime?.minute || 0,
		karateClass?.weekDays,
	)

	// Otra clase para verificar si hay espacio en el horario
	const [anotherClass] = classesInTimeRange?.filter((classInTimeRange) => String(classInTimeRange._id) !== id)
	const selfClassInfo = classesInTimeRange?.find((classInTimeRange) => String(classInTimeRange._id) === id)

	const studentLimit = locationCapacityLimits[karateClass.location?.toLowerCase?.() || 'spring'] || 40

	if (
		(anotherClass?.students || 0) +
			(anotherClass?.recoveryClasses || 0) +
			karateClass?.students?.length +
			(selfClassInfo?.recoveryClasses || 0) +
			1 >
		studentLimit
	) {
		res.status(BAD_REQUEST)
		throw new Error(
			anotherClass
				? `The number of students for the schedule exceeds ${studentLimit} students. Class at the same time: ${
						anotherClass?.className
				  } (${anotherClass?.students || 0} students and ${anotherClass?.recoveryClasses || 0} recovery classes)`
				: `The number of students for the schedule exceeds ${studentLimit} students. Students: ${
						selfClassInfo?.students || 0
				  } and recovery classes: ${selfClassInfo?.recoveryClasses || 0}`,
		)
	}

	const recoveryClasses = karateClass.recoveryClasses || []
	const recoveryClassPayload: any = {
		karateClass: id as any,
		student: studentId,
		date,
	}

	if (attendanceId) {
		recoveryClassPayload.attendance = attendanceId
	}

	const recoveryClass = await recoveryClassRepository.createRecoveryClass(recoveryClassPayload)

	if (!recoveryClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating recovery class.')
	}

	if (!attendanceId) {
		const student = await userRepository.findUserById(studentId)
		if (student) {
			student.recoveryCreditsAdjustment = (student.recoveryCreditsAdjustment || 0) - 1
			await userRepository.saveUser(student)
		}
	}

	recoveryClasses.push(recoveryClass._id as any)
	karateClass.recoveryClasses = recoveryClasses

	const karateClassUpdated = await karateClassRepository.saveKarateClass(karateClass)

	if (!karateClassUpdated) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error updating class with recovery class info.')
	}

	// Try to sync with real attendance if it exists
	if (attendanceId) {
		try {
			await studentAttendanceRepository.syncRecoveryWithRealAttendance(
				'add',
				recoveryClass,
				new Types.ObjectId(studentId),
				new Types.ObjectId(id),
				date,
			)
		} catch (error) {
			console.log(error)

			// Don't fail the booking if sync fails
		}
	}

	res.status(OK).json(recoveryClass)
})
