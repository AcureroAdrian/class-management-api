'use strict'

import mongoose from 'mongoose'
import { HydratedDocument } from 'mongoose'
import { StudentAttendance, IStudentAttendance, IStudentAttendanceDocument } from '../models/StudentAttendance'
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
				karateClass: new ObjectId(classId),
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
				attendanceDate: 1,
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

export async function findStudentAttendanceInAllClassesAndDates(
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
				attendanceDate: 1,
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
		{
			$lookup: {
				from: 'users',
				localField: 'attendance.student',
				foreignField: '_id',
				as: 'students',
			},
		},
	])
}

export async function saveStudentAttendance(studentAttendace: HydratedDocument<IStudentAttendance>) {
	return studentAttendace.save()
}
