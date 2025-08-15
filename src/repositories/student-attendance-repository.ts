'use strict'

import { format } from 'date-fns'
import mongoose, { HydratedDocument } from 'mongoose'
import { StudentAttendance, IStudentAttendance, IStudentAttendanceDocument } from '../models/StudentAttendance'
import * as karateClassRepository from './karate-class-repository'
const { ObjectId } = mongoose.Types

export async function createStudentAttendance(studentAttendance: IStudentAttendanceDocument) {
	return StudentAttendance.create(studentAttendance)
}

export async function findStudentAttendances() {
	return StudentAttendance.find({ status: 'active' })
}

export async function findStudentAttendanceById(studentAttendanceId: string) {
	return StudentAttendance.findById(studentAttendanceId)
}

export async function findStudentAttendanceByDates(
	startDate: { year: number; month: number; day: number },
	endDate: { year: number; month: number; day: number },
) {
	return StudentAttendance.aggregate([
		{
			$addFields: {
				startDate: {
					$dateFromParts: {
						year: startDate.year,
						month: startDate.month,
						day: startDate.day,
					},
				},
				endDate: {
					$dateFromParts: {
						year: endDate.year,
						month: endDate.month,
						day: endDate.day,
					},
				},
				attendanceDate: {
					$dateFromParts: {
						year: '$date.year',
						month: '$date.month',
						day: '$date.day',
					},
				},
			},
		},
		{
			$match: {
				$expr: {
					$and: [
						{
							$gte: ['$attendanceDate', '$startDate'],
						},
						{
							$lte: ['$attendanceDate', '$endDate'],
						},
					],
				},
			},
		},
		{
			$lookup: {
				from: 'karateclasses',
				localField: 'karateClass',
				foreignField: '_id',
				as: 'karateClass',
			},
		},
		{
			$unwind: '$karateClass',
		},
		{
			$unwind: '$attendance',
		},
		{
			$lookup: {
				from: 'users',
				localField: 'attendance.student',
				foreignField: '_id',
				as: 'attendance.student',
			},
		},
		{
			$unwind: '$attendance.student',
		},
		{
			$group: {
				_id: '$_id',
				karateClassName: {
					$first: '$karateClass.name',
				},
				date: { $first: '$date' },
				attendance: { $push: '$attendance' },
				attendanceDate: { $first: '$attendanceDate' },
			},
		},
		{
			$group: {
				_id: '$attendanceDate',
				karateClasses: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$sort: {
				_id: -1,
			},
		},
	])
}

export async function findStudentAttendanceByClassAndDates(
	startDate: { year: number; month: number; day: number },
	endDate: { year: number; month: number; day: number },
	classId: string,
) {
	return StudentAttendance.aggregate([
		{
			$addFields: {
				startDate: {
					$dateFromParts: {
						year: startDate.year,
						month: startDate.month,
						day: startDate.day,
					},
				},
				endDate: {
					$dateFromParts: {
						year: endDate.year,
						month: endDate.month,
						day: endDate.day,
					},
				},
				attendanceDate: {
					$dateFromParts: {
						year: '$date.year',
						month: '$date.month',
						day: '$date.day',
					},
				},
			},
		},
		{
			$match: {
				karateClass: classId === 'all' ? { $exists: true } : new ObjectId(classId),
				$expr: {
					$and: [
						{
							$gte: ['$attendanceDate', '$startDate'],
						},
						{
							$lte: ['$attendanceDate', '$endDate'],
						},
					],
				},
			},
		},
		{
			$lookup: {
				from: 'karateclasses',
				localField: 'karateClass',
				foreignField: '_id',
				as: 'karateClass',
			},
		},
		{
			$unwind: '$karateClass',
		},
		{
			$unwind: '$attendance',
		},
		{
			$lookup: {
				from: 'users',
				localField: 'attendance.student',
				foreignField: '_id',
				as: 'attendance.student',
			},
		},
		{
			$unwind: '$attendance.student',
		},
		{
			$group: {
				_id: '$_id',
				karateClass: { $first: '$karateClass._id' },
				karateClassName: {
					$first: '$karateClass.name',
				},
				date: { $first: '$date' },
				attendance: { $push: '$attendance' },
				attendanceDate: {
					$first: '$attendanceDate',
				},
			},
		},
		{
			$sort: {
				attendanceDate: -1,
			},
		},
		{
			$group: {
				_id: '$karateClass',
				karateClassName: { $first: '$karateClassName' },
				attendances: {
					$push: {
						date: '$date',
						attendance: '$attendance',
					},
				},
			},
		},
	])
}

export async function findStudentAttendanceByDatesAndStudentId(
	startDate: { year: number; month: number; day: number },
	endDate: { year: number; month: number; day: number },
	classId: string,
	studentId: string,
) {
	return StudentAttendance.aggregate([
		{
			$addFields: {
				startDate: {
					$dateFromParts: {
						year: startDate.year,
						month: startDate.month,
						day: startDate.day,
					},
				},
				endDate: {
					$dateFromParts: {
						year: endDate.year,
						month: endDate.month,
						day: endDate.day,
					},
				},
				attendanceDate: {
					$dateFromParts: {
						year: '$date.year',
						month: '$date.month',
						day: '$date.day',
					},
				},
			},
		},
		{
			$match: {
				karateClass: classId === 'all' ? { $exists: true } : new ObjectId(classId),
				$expr: {
					$and: [
						{
							$gte: ['$attendanceDate', '$startDate'],
						},
						{
							$lte: ['$attendanceDate', '$endDate'],
						},
					],
				},
			},
		},
		{
			$lookup: {
				from: 'karateclasses',
				localField: 'karateClass',
				foreignField: '_id',
				as: 'karateClass',
			},
		},
		{
			$unwind: '$karateClass',
		},
		{
			$unwind: '$attendance',
		},
		{
			$match: {
				'attendance.student': new ObjectId(studentId),
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'attendance.student',
				foreignField: '_id',
				as: 'student',
			},
		},
		{
			$unwind: '$student',
		},
		{
			$sort: {
				attendanceDate: -1,
			},
		},
		{
			$project: {
				karateClassName: '$karateClass.name',
				date: true,
				student: true,
				attendanceStatus: '$attendance.attendanceStatus',
				observations: '$attendance.observations',
				isDayOnly: '$attendance.isDayOnly',
				isRecovery: '$attendance.isRecovery',
			},
		},
	])
}

export async function findStudentAttendanceByDay(year: number, month: number, day: number) {
	return StudentAttendance.aggregate([
		{
			$match: {
				$and: [{ 'date.year': year }, { 'date.month': month }, { 'date.day': day }],
			},
		},
		{
			$lookup: {
				from: 'karateclasses',
				localField: 'karateClass',
				foreignField: '_id',
				as: 'karateClass',
			},
		},
		{
			$unwind: '$karateClass',
		},
		// Lookup recovery classes for this class (not day-specific)
		{
			$lookup: {
				from: 'recoveryclasses',
				let: { classId: '$karateClass._id' },
				pipeline: [
					{
						$match: {
							status: 'active',
							$expr: { $eq: ['$karateClass', '$$classId'] },
						},
					},
				],
				as: 'recoveryClasses',
			},
		},
		{
			$lookup: {
				from: 'users',
				let: { studentIds: '$karateClass.students' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $in: ['$_id', '$$studentIds'] },
									{ $eq: ['$status', 'active'] },
									{ $eq: ['$isSuper', false] },
									{ $eq: ['$isAdmin', false] },
									{ $eq: ['$isTeacher', false] },
								],
							},
						},
					},
				],
				as: 'karateClass.students',
			},
		},
		// Unwind attendance array to process each attendance record individually
		{
			$unwind: '$attendance',
		},
		// Lookup student information for each attendance record
		{
			$lookup: {
				from: 'users',
				localField: 'attendance.student',
				foreignField: '_id',
				as: 'attendanceStudent',
			},
		},
		{
			$unwind: '$attendanceStudent',
		},
		// Group back the attendance records with complete student information
		{
			$group: {
				_id: '$_id',
				karateClass: { $first: '$karateClass' },
				date: { $first: '$date' },
				status: { $first: '$status' },
				recoveryClasses: { $first: '$recoveryClasses' },
				attendance: {
					$push: {
						student: '$attendanceStudent',
						attendanceStatus: '$attendance.attendanceStatus',
						observations: '$attendance.observations',
						isDayOnly: '$attendance.isDayOnly',
						isRecovery: {
							$in: ['$attendance.student', '$recoveryClasses.student'],
						},
						recoveryClassId: {
							$let: {
								vars: {
									matchedRecovery: {
										$arrayElemAt: [
											{
												$filter: {
													input: '$recoveryClasses',
													as: 'rc',
													cond: { $eq: ['$$rc.student', '$attendance.student'] },
												},
											},
											0,
										],
									},
								},
								in: '$$matchedRecovery._id',
							},
						},
					},
				},
			},
		},
		{
			$project: {
				_id: 1,
				karateClass: 1,
				date: 1,
				attendance: 1,
				status: 1,
				students: 1,
			},
		},
	])
}

export async function findAbsentsByStudentId(studentId: string, options: { onlyUnbooked?: boolean } = {}) {
	const { onlyUnbooked = false } = options
	const [year, month, day] = format(new Date(), 'yyyy-MM-dd').split('-')
	const pipeline: any[] = [
		{
			$addFields: {
				today: {
					$dateFromParts: {
						year: Number(year),
						month: Number(month),
						day: Number(day),
					},
				},
				attendanceDate: {
					$dateFromParts: {
						year: '$date.year',
						month: '$date.month',
						day: '$date.day',
					},
				},
			},
		},
		{
			$match: {
				$expr: {
					$and: [
						{
							$eq: ['$date.year', Number(year)],
						},
						{
							$lt: ['$attendanceDate', '$today'],
						},
					],
				},
			},
		},
		{
			$unwind: '$attendance',
		},
		{
			$match: {
				'attendance.student': new ObjectId(studentId),
				'attendance.attendanceStatus': 'absent', // REVISAR
				'attendance.isDayOnly': { $ne: true },
				'attendance.isRecovery': { $ne: true },
			},
		},
		{
			$lookup: {
				from: 'recoveryclasses',
				let: {
					studentId: { $toString: '$attendance.student' },
					attendanceId: '$_id',
				},
				pipeline: [
					{
						$match: {
							status: 'active',
							$expr: {
								$and: [
									{ $eq: ['$attendance', '$$attendanceId'] },
									{ $eq: [{ $toString: '$student' }, '$$studentId'] },
								],
							},
						},
					},
					{ $sort: { 'date.year': 1, 'date.month': 1, 'date.day': 1, 'date.hour': 1, 'date.minute': 1 } },
					{ $limit: 1 },
				],
				as: 'recoveryClass',
			},
		},
		{
			$unwind: {
				path: '$recoveryClass',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$sort: {
				attendanceDate: 1,
			},
		},
	]

	// Opcional: devolver solo ausencias no reservadas
	if (onlyUnbooked) {
		pipeline.push({ $match: { recoveryClass: null } })
	}

	return StudentAttendance.aggregate(pipeline)
}

export async function saveStudentAttendance(studentAttendace: HydratedDocument<IStudentAttendance>) {
	return studentAttendace.save()
}

// Helper function to find real attendance by date and class
export async function findRealAttendanceByDateAndClass(
	karateClassId: any,
	date: { year: number; month: number; day: number; hour: number; minute: number },
) {
	return StudentAttendance.findOne({
		karateClass: karateClassId,
		'date.year': date.year,
		'date.month': date.month,
		'date.day': date.day,
		'date.hour': date.hour,
		'date.minute': date.minute,
		status: 'active',
	})
}

// Helper function to sync recovery student with real attendance
export async function syncRecoveryWithRealAttendance(
	action: 'add' | 'remove',
	recoveryClass: any,
	studentId: any,
	karateClassId: any,
	date: { year: number; month: number; day: number; hour: number; minute: number },
) {
	try {
		// Find real attendance for this specific date and class
		let attendance = await findRealAttendanceByDateAndClass(karateClassId, date)

		// If attendance doesn't exist and we are adding a student, create it first
		if (!attendance && action === 'add') {
			const karateClass = await karateClassRepository.findKarateClassById(karateClassId.toString())
			if (!karateClass) {
				console.log(`Sync failed: Karate class ${karateClassId} not found.`)
				return // or throw error
			}
			const newAttendanceData = {
				karateClass: karateClassId,
				date: date,
				attendance: karateClass.students.map((sId: any) => ({
					student: sId,
					attendanceStatus: 'absent' as any,
					isDayOnly: false,
				})),
				status: 'active' as any,
			}
			attendance = await createStudentAttendance(newAttendanceData)
			if (!attendance) {
				console.log(`Sync failed: Could not create new attendance for class ${karateClassId}.`)
				return // or throw error
			}
		}

		if (!attendance) {
			return
		}

		if (action === 'add') {
			// Add recovery student to existing real attendance
			const existingStudent = attendance.attendance.find(
				(item: any) => item.student.toString() === studentId.toString(),
			)

			if (!existingStudent) {
				attendance.attendance.push({
					student: studentId,
					attendanceStatus: 'absent',
					isRecovery: true,
					recoveryClassId: recoveryClass._id,
					isDayOnly: false,
				})
			}
		} else if (action === 'remove') {
			const beforeLength = attendance.attendance.length

			// Strategy 1: Try exact match with recoveryClassId
			let itemsToKeep = attendance.attendance.filter((item: any) => {
				const exactMatch =
					item.student.toString() === recoveryClass.student.toString() &&
					item.isRecovery === true &&
					item.recoveryClassId?.toString() === recoveryClass._id.toString()

				return !exactMatch
			})

			// Strategy 2: If no exact match found and student has recovery with undefined recoveryClassId, remove it as fallback
			if (itemsToKeep.length === beforeLength) {
				const fallbackMatch = attendance.attendance.find(
					(item: any) =>
						item.student.toString() === recoveryClass.student.toString() &&
						item.isRecovery === true &&
						(!item.recoveryClassId || item.recoveryClassId === undefined),
				)

				if (fallbackMatch) {
					itemsToKeep = attendance.attendance.filter(
						(item: any) =>
							!(
								item.student.toString() === recoveryClass.student.toString() &&
								item.isRecovery === true &&
								(!item.recoveryClassId || item.recoveryClassId === undefined)
							),
					)
				}
			}

			attendance.attendance = itemsToKeep
		}

		// Save the updated attendance
		await attendance.save()
	} catch (error) {
		// Don't throw error to avoid breaking the main flow
		console.log(error)
	}
}
