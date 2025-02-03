'use strict'

import { HydratedDocument } from 'mongoose'
import { StudentAttendance, IStudentAttendance, IStudentAttendanceDocument } from '../models/StudentAttendance'

export async function createStudentAttendance(studentAttendance: IStudentAttendanceDocument) {
	return StudentAttendance.create(studentAttendance)
}

export async function findStudentAttendances() {
	return StudentAttendance.find({ status: 'active' })
}

export async function findStudentAttendanceById(studentAttendanceId: string) {
	return StudentAttendance.findById(studentAttendanceId)
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
	])
}

export async function saveStudentAttendance(studentAttendace: HydratedDocument<IStudentAttendance>) {
	return studentAttendace.save()
}
