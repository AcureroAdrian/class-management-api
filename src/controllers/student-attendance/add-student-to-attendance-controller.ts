'use strict'

import asyncHandler from 'express-async-handler'
import { Response } from 'express'
import { IRequest } from '../../middleware/auth-middleware'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as userRepository from '../../repositories/user-repository'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from '../../utils/http-server-status-codes'
import { mongoIdValidator } from '../../utils/validators/input-validator'

// @desc    Add student to specific attendance
// @route   POST /api/student-attendances/add-student-to-attendance
// @access  Admin
export const addStudentToAttendance = asyncHandler(async (req: IRequest, res: Response) => {
	const { studentId, attendanceId, isDayOnly = false, addPermanently = false, classId, date } = req.body

	if (!mongoIdValidator(studentId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid student id.')
	}

	// Check if student exists
	const student = await userRepository.findUserById(studentId)
	if (!student) {
		res.status(BAD_REQUEST)
		throw new Error('Student not found.')
	}

	let attendance: any = null
	let isVirtualAttendance = false

	// Check if it's a virtual attendance (starts with 'virtual-')
	if (attendanceId.startsWith('virtual-')) {
		isVirtualAttendance = true
		
		// Extract class info from virtual ID or use provided classId and date
		if (!classId || !date) {
			res.status(BAD_REQUEST)
			throw new Error('Class ID and date are required for virtual attendance.')
		}

		if (!mongoIdValidator(classId)) {
			res.status(BAD_REQUEST)
			throw new Error('Invalid class id.')
		}

		// Verify class exists and get it for modification
		const karateClass = await karateClassRepository.findKarateClassById(classId)
		if (!karateClass) {
			res.status(BAD_REQUEST)
			throw new Error('Class not found.')
		}

		// Get class with recovery students for creating attendance
		const [karateClassWithRecovery] = await karateClassRepository.findKarateClassByIdWithRecoveryClasses(classId, date)
		if (!karateClassWithRecovery) {
			res.status(BAD_REQUEST)
			throw new Error('Class not found.')
		}

		const newAttendanceData = {
			karateClass: classId,
			date: date,
			attendance: [{
				student: studentId as any,
				attendanceStatus: 'absent' as any,
				isDayOnly: isDayOnly || student.isTrial,
			}],
			status: 'active' as any,
		}

		// Create new real attendance from virtual
		karateClassWithRecovery.students.map((student: any) => {
			newAttendanceData.attendance.push({
				student: student as any,
				attendanceStatus: 'absent' as any,
				isDayOnly: false,
			})
		})		

		attendance = await studentAttendanceRepository.createStudentAttendance(newAttendanceData)
		if (!attendance) {
			res.status(INTERNAL_SERVER_ERROR)
			throw new Error('Error creating attendance from virtual.')
		}

		// If addPermanently is true and not day-only, add to class
		if (addPermanently && !isDayOnly && !student.isTrial) {
			if (!karateClass.students.includes(studentId as any)) {
				karateClass.students.push(studentId as any)
				await karateClassRepository.saveKarateClass(karateClass)
			}
		}

		res.status(OK).json(attendance)
		return
	}

	// Handle real attendance
	if (!mongoIdValidator(attendanceId)) {
		res.status(BAD_REQUEST)
		throw new Error('Invalid attendance id.')
	}

	attendance = await studentAttendanceRepository.findStudentAttendanceById(attendanceId)
	if (!attendance) {
		res.status(BAD_REQUEST)
		throw new Error('Attendance not found.')
	}

	// Check if student already in attendance
	const existingAttendance = attendance.attendance.find(
		(item: any) => item.student.toString() === studentId
	)
	if (existingAttendance) {
		res.status(BAD_REQUEST)
		throw new Error('Student already in attendance.')
	}

	// Add student to existing attendance
	attendance.attendance.push({
		student: studentId as any,
		attendanceStatus: 'present',
		isDayOnly: isDayOnly || student.isTrial,
	})

	const updatedAttendance = await studentAttendanceRepository.saveStudentAttendance(attendance)
	if (!updatedAttendance) {
		res.status(INTERNAL_SERVER_ERROR)
		throw new Error('Error adding student to attendance.')
	}

	// If addPermanently is true and not day-only, add to class
	if (addPermanently && !isDayOnly && !student.isTrial) {
		const karateClass = await karateClassRepository.findKarateClassById(attendance.karateClass.toString())
		if (karateClass && !karateClass.students.includes(studentId as any)) {
			karateClass.students.push(studentId as any)
			await karateClassRepository.saveKarateClass(karateClass)
		}
	}

	res.status(OK).json(updatedAttendance)
}) 