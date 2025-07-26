'use strict'

import { HydratedDocument } from 'mongoose'
import { RecoveryClass, IRecoveryClass, IRecoveryClassDocument } from '../models/RecoveryClass'

export async function createRecoveryClass(recoveryClass: IRecoveryClassDocument) {
	return RecoveryClass.create(recoveryClass)
}

export async function findRecoveryClassById(recoveryClassId: string) {
	return RecoveryClass.findById(recoveryClassId)
}

export async function saveRecoveryClass(recoveryClass: HydratedDocument<IRecoveryClass>) {
	return recoveryClass.save()
}

export async function findActiveRecoveryClassesByStudentId(studentId: string) {
	return RecoveryClass.find({ student: studentId, status: 'active' }).lean()
}

export async function findRecoveryClassByDetails(studentId: string | undefined, karateClassId: string, date: any) {
	const query: any = {
		karateClass: karateClassId,
		'date.year': date.year,
		'date.month': date.month,
		'date.day': date.day,
		'date.hour': date.hour,
		'date.minute': date.minute,
		status: 'active', // Only look for active bookings
	}

	if (studentId) {
		query.student = studentId
	}

	return RecoveryClass.find(query).populate('student').lean()
}

export async function deleteRecoveryClassById(recoveryClassId: string) {
	return RecoveryClass.findByIdAndDelete(recoveryClassId)
}
