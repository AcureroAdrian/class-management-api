'use strict'

import { HydratedDocument } from 'mongoose'
import { KarateClass, IKarateClass, IKarateClassDocument } from '../models/KarateClass'
import { TDaysOfWeek } from '../utils/common-types'

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

export async function findValidKarateClasses() {
	return KarateClass.find({ status: 'active', students: { $ne: [] } }, 'name description startTime weekDays')
}

export async function saveKarateClass(karateClass: HydratedDocument<IKarateClass>) {
	return karateClass.save()
}
