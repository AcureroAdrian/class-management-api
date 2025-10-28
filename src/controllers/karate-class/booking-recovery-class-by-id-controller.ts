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
import { getAvailableCreditsForStudent } from '../../utils/credits-service'

// @desc    Booking recovery karate class by id
// @route   PUT /api/karate-classes/recovery-class/:id
// @access  Student or Admin
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
		throw new Error('Invalid absence.')
	}

	// Validar que el estudiante existe
	const student = await userRepository.findUserById(studentId)
	if (!student) {
		res.status(BAD_REQUEST)
		throw new Error('Student not found.')
	}

	// Obtener información de créditos disponibles
	const creditsInfo = await getAvailableCreditsForStudent(studentId)

	// Congelado: inactivo o sin plan -> no puede reservar
	if (creditsInfo.isFrozen) {
		res.status(BAD_REQUEST)
		throw new Error('Student account is frozen. Cannot book recovery classes.')
	}

	// Validar que tiene créditos disponibles
	if (creditsInfo.totalCredits <= 0) {
		res.status(BAD_REQUEST)
		throw new Error('Student has no recovery credits.')
	}

	// attendanceId es opcional - si se proporciona, se vincula; si no, se reserva sin vínculo
	let finalAttendanceId = attendanceId

	const karateClass = await karateClassRepository.findKarateClassById(id)

	//Class students validation
	const classesInTimeRange = await karateClassRepository.findClassesInTimeRangeAndLocation(
		karateClass?.location || 'spring',
		karateClass?.startTime?.hour || 0,
		karateClass?.startTime?.minute || 0,
		karateClass?.weekDays,
	)

	// Another class to check for space in the schedule
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

	// Consumir primero crédito por ajuste si hay disponible
	const adjustmentTotal = student.recoveryCreditsAdjustment || 0
	const adjustmentUsed = student.usedRecoveryAdjustmentCredits || 0
	const shouldUseAdjustment = adjustmentTotal - adjustmentUsed > 0

	const recoveryClassPayload: any = {
		karateClass: id as any,
		student: studentId,
		date,
		usedAdjustment: shouldUseAdjustment,
	}

	if (finalAttendanceId) {
		recoveryClassPayload.attendance = finalAttendanceId
	}

	const recoveryClass = await recoveryClassRepository.createRecoveryClass(recoveryClassPayload)

	// Si se usó ajuste, incrementar contador de usados en el estudiante
	if (recoveryClass && shouldUseAdjustment) {
		student.usedRecoveryAdjustmentCredits = (student.usedRecoveryAdjustmentCredits || 0) + 1
		await userRepository.saveUser(student)
	}

	if (!recoveryClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error creating recovery class.')
	}

	// Ya no necesitamos decrementar el ajuste manual aquí
	// El consumo se refleja automáticamente en el conteo de bookings activos

	recoveryClasses.push(recoveryClass._id as any)
	karateClass.recoveryClasses = recoveryClasses

	const karateClassUpdated = await karateClassRepository.saveKarateClass(karateClass)

	if (!karateClassUpdated) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error updating class with recovery class info.')
	}

	// Try to sync with real attendance if it exists
	if (recoveryClass) {
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
