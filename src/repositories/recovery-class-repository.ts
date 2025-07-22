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
