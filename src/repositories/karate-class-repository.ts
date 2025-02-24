'use strict'

import { format } from 'date-fns'
import mongoose, { HydratedDocument, ObjectId } from 'mongoose'
import { KarateClass, IKarateClass, IKarateClassDocument } from '../models/KarateClass'
import { TDaysOfWeek, TLocation, TUserLevel } from '../utils/common-types'

const ObjectIdGen = mongoose.Types.ObjectId

export async function createKarateClass(karateClass: IKarateClassDocument) {
	return KarateClass.create(karateClass)
}

export async function findKarateClasses() {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'students',
				foreignField: '_id',
				pipeline: [
					{
						$match: {
							status: 'active',
							isTeacher: false,
							isAdmin: false,
							isSuper: false,
						},
					},
				],
				as: 'students',
			},
		},
		{
			$project: {
				name: true,
				students: true,
				description: true,
			},
		},
	])
}

export async function findKarateClassById(classId: string) {
	return KarateClass.findById(classId)
}

export async function findKarateClassesByWeekDay(weekDay: TDaysOfWeek) {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				weekDays: weekDay,
				students: { $gt: [] },
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'students',
				foreignField: '_id',
				pipeline: [
					{
						$match: {
							status: 'active',
							isSuper: false,
							isAdmin: false,
							isTeacher: false,
						},
					},
				],
				as: 'students',
			},
		},
		{
			$lookup: {
				from: 'recoveryclasses',
				localField: 'recoveryClasses',
				foreignField: '_id',
				pipeline: [
					{
						$match: {
							status: 'active',
						},
					},
					{
						$lookup: {
							from: 'users',
							localField: 'student',
							foreignField: '_id',
							pipeline: [
								{
									$match: {
										status: 'active',
										isSuper: false,
										isAdmin: false,
										isTeacher: false,
									},
								},
							],
							as: 'student',
						},
					},
					{
						$unwind: '$student',
					},
				],
				as: 'recoveryClasses',
			},
		},
		{
			$project: {
				name: true,
				description: true,
				startTime: true,
				students: {
					$concatArrays: ['$students', '$recoveryClasses.student'],
				},
			},
		},
	])
}

export async function findKarateClassesForStudent(age: number, level: TUserLevel, studentId: string) {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				minAge: { $lte: age },
				maxAge: { $gte: age },
				levels: level,
				$and: [{ students: { $gt: [] } }, { students: { $nin: [new ObjectIdGen(studentId)] } }],
			},
		},
	])
}

export async function findKarateClassesByStudentId(studentId: string) {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				students: new ObjectIdGen(studentId),
			},
		},
	])
}

export async function findRecoveryClassesByStudentId(
	studentId: string,
	startDate: { year: number; month: number; day: number },
	endDate: { year: number; month: number; day: number },
) {
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				students: new ObjectIdGen(studentId),
			},
		},
	])
}

export async function findClassesInTimeRangeAndLocation(
	location: TLocation,
	hour: number,
	minute: number,
	weekDays: TDaysOfWeek[],
) {
	const [year, month, day] = format(new Date(), 'yyyy-MM-dd').split('-')
	return KarateClass.aggregate([
		{
			$match: {
				status: 'active',
				location: location,
				'startTime.hour': hour,
				'startTime.minute': minute,
				students: { $gt: [] },
				weekDays: { $in: weekDays },
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'students',
				foreignField: '_id',
				pipeline: [
					{
						$match: {
							status: 'active',
							isTeacher: false,
							isAdmin: false,
							isSuper: false,
						},
					},
				],
				as: 'students',
			},
		},
		{
			$lookup: {
				from: 'recoveryclasses',
				localField: 'recoveryClasses',
				foreignField: '_id',
				pipeline: [
					{
						$addFields: {
							recoveryDate: {
								$dateFromParts: {
									year: { $year: '$sdaate.year' },
									month: { $month: '$sdaate.month' },
									day: { $dayOfMonth: '$sdaate.day' },
								},
							},
							today: {
								$dateFromParts: {
									year: Number(year),
									month: Number(month),
									day: Number(day),
								},
							},
						},
					},
					{
						$match: {
							status: 'active',
							$expr: { $gt: ['$recoveryDate', new Date()] },
						},
					},
					{
						$lookup: {
							from: 'users',
							localField: 'student',
							foreignField: '_id',
							pipeline: [
								{
									$match: {
										status: 'active',
										isTeacher: false,
										isAdmin: false,
										isSuper: false,
									},
								},
							],
							as: 'student',
						},
					},
					{
						$unwind: '$student',
					},
				],
				as: 'recoveryClasses',
			},
		},
		{
			$project: {
				className: '$name',
				students: { $size: '$students' },
				recoveryClasses: { $size: '$recoveryClasses' },
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
