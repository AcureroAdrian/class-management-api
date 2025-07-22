'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'
import { logger } from '../../logger'
import { addDays } from 'date-fns'
import mongoose from 'mongoose'
import { StudentAttendance } from '../../models/StudentAttendance'
import { locationCapacityLimits } from '../../utils/short-values'

// @desc    PATCH update karate class by id
// @route   PATCH /api/karate-classes/:id
// @access  Admin
export const updateKarateClassById = asyncHandler(async (req: IRequest, res: Response) => {
	const data = req.body
	const { name, minAge, maxAge, levels, weekDays, description, location } = data
	const { id: karateClassId } = req.params

	if (!mongoIdValidator(karateClassId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class id.')
	}

	if (name && !name?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class name.')
	}
	if (minAge && isNaN(minAge)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid minimum age.')
	}
	if (maxAge && isNaN(maxAge)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid maximum age.')
	}
	if (levels && !levels?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid class levels.')
	}
	if (weekDays && !weekDays?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid week days of the week.')
	}
	if (description && !description?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid description.')
	}
	if (location && !location?.length) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid location.')
	}

	const karateClass = await karateClassRepository.findKarateClassById(karateClassId)

	if (!karateClass) {
		res.status(BAD_REQUEST)
		throw new Error('Class not found.')
	}

	Object.keys(data).forEach((key) => {
		;(karateClass as any)[key] = data[key]
	})

	//Class students validation
	if (Boolean(data?.students) || Boolean(data?.startTime) || weekDays || location) {
		const classesInTimeRange = await karateClassRepository.findClassesInTimeRangeAndLocation(
			karateClass?.location || 'spring',
			karateClass?.startTime?.hour || 0,
			karateClass?.startTime?.minute || 0,
			karateClass?.weekDays,
		)

		const anotherClasses = classesInTimeRange?.filter(
			(classInTimeRange) => String(classInTimeRange._id) !== karateClassId,
		)

		if (anotherClasses?.length > 1) {
			res.status(BAD_REQUEST)
			throw new Error(
				`Class cannot be updated because there are already 2 classes for that same day, time and location. Classes: ${anotherClasses?.[0]?.className}, ${anotherClasses?.[1]?.className}.`,
			)
		}

		const [anotherClass] = anotherClasses
		const selfClassInfo = classesInTimeRange?.find((classInTimeRange) => String(classInTimeRange._id) === karateClassId)

		const studentLimit = locationCapacityLimits[karateClass.location?.toLowerCase?.() || 'spring'] || 40

		if (
			(anotherClass?.students || 0) +
				(anotherClass?.recoveryClasses || 0) +
				karateClass?.students?.length +
				(selfClassInfo?.recoveryClasses || 0) >
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
	}

	const updatedKarateClass = await karateClassRepository.saveKarateClass(karateClass)

	if (!updatedKarateClass) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Failed to update class.')
	}

	// Sync future attendances if students array changed
	if (data.students) {
		await syncFutureAttendances(karateClassId, updatedKarateClass.students)
	}

	logger.log({
		level: 'info',
		message: `Class: ${karateClass?.name} updated.`,
	})

	res.status(OK).json(updatedKarateClass)
})

// Helper function to sync future REAL attendances when class students change
// Virtual attendances will automatically regenerate with updated class data
async function syncFutureAttendances(classId: string, newStudents: any[]) {
	try {
		const today = new Date()
		today.setHours(0, 0, 0, 0) // Consider from the beginning of today
		const futureDate = addDays(today, 30) // Sync next 30 days

		// This query returns an array of real attendance documents for the specified classId
		const futureAttendances = await StudentAttendance.find({
			karateClass: new mongoose.Types.ObjectId(classId),
			status: 'active',
			'date.year': { $gte: today.getFullYear() },
			'date.month': { $gte: today.getMonth() + 1 },
			'date.day': { $gte: today.getDate() },
		}).exec()

		let syncedCount = 0
		const newStudentIds = newStudents.map((s) => s.toString())

		// Update each REAL future attendance
		for (const attendance of futureAttendances) {
			if (!attendance) continue

			const originalAttendanceList = attendance.attendance || []
			let newAttendanceList = [...originalAttendanceList]
			let wasModified = false

			// Students who should be in the attendance
			const classStudentIds = new Set(newStudentIds)

			// 1. Remove students who are no longer in the class (unless they are day-only)
			const filteredList = newAttendanceList.filter(
				(item: any) => classStudentIds.has(item.student.toString()) || item.isDayOnly,
			)

			if (filteredList.length !== newAttendanceList.length) {
				newAttendanceList = filteredList
				wasModified = true
			}

			// 2. Add new students who are not yet in the attendance list
			const studentsInAttendance = new Set(newAttendanceList.map((item: any) => item.student.toString()))

			for (const studentId of newStudentIds) {
				if (!studentsInAttendance.has(studentId)) {
					newAttendanceList.push({
						student: studentId as any,
						attendanceStatus: 'absent',
						isDayOnly: false,
					})
					wasModified = true
				}
			}

			if (wasModified) {
				attendance.attendance = newAttendanceList
				await studentAttendanceRepository.saveStudentAttendance(attendance)
				syncedCount++
			}
		}

		if (syncedCount > 0) {
			logger.log({
				level: 'info',
				message: `Synced ${syncedCount} real future attendances for class ${classId}. Virtual attendances will auto-regenerate.`,
			})
		}
	} catch (error) {
		logger.log({
			level: 'error',
			message: `Failed to sync future attendances for class ${classId}: ${error}`,
		})
	}
}
