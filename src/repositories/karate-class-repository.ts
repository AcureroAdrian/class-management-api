'use strict'

import mongoose, { HydratedDocument } from 'mongoose'
import { KarateClass, IKarateClass, IKarateClassDocument } from '../models/KarateClass'
import { TDaysOfWeek, TUserLevel } from '../utils/common-types'

const { ObjectId } = mongoose.Types

export async function createKarateClass(karateClass: IKarateClassDocument) {
	return KarateClass.create(karateClass)
}

export async function findKarateClasses() {
	return KarateClass.find({ status: 'active' }, 'name students description')
}

export async function findKarateClassById(classId: string) {
	return KarateClass.findById(classId)
}

export async function findKarateClassesByWeekDay(weekDay: TDaysOfWeek) {
	return KarateClass.find(
		{ status: 'active', weekDays: weekDay, students: { $gt: [] } },
		'startTime students name description',
	).populate('students')
}

export async function findKarateClassesForStudent(age: number, level: TUserLevel) {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				minAge: { $lte: age },
				maxAge: { $gte: age },
				levels: level,
			},
		},
	])
}

export async function findKarateClassesByStudentId(studentId: string) {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				students: new ObjectId(studentId),
			},
		},
	])
}

export async function findValidKarateClasses() {
	return KarateClass.find({ status: 'active', students: { $ne: [] } }, 'name description startTime weekDays')
}

export async function saveKarateClass(karateClass: HydratedDocument<IKarateClass>) {
	return karateClass.save()
}
