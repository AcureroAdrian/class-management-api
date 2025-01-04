'use strict'

import { HydratedDocument } from 'mongoose'
import { KarateClass, IKarateClass, IKarateClassDocument } from '../models/KarateClass'

export async function createKarateClass(karateClass: IKarateClassDocument) {
	return KarateClass.create(karateClass)
}

export async function findKarateClasses() {
	return KarateClass.find({ status: 'active' }, 'name students')
}

export async function findKarateClassById(classId: string) {
	return KarateClass.findById(classId)
}

export async function saveKarateClass(karateClass: HydratedDocument<IKarateClass>) {
	return karateClass.save()
}
