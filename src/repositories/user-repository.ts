'use strict'

import { HydratedDocument } from 'mongoose'
import { User, IUser, IUserDocument } from '../models/User'

export async function createUser(user: IUserDocument) {
	return User.create(user)
}

export async function createManyStudents(users: IUserDocument[]) {
	return User.insertMany(users)
}

export async function findUserById(userId: string) {
	return User.findById(userId)
}

export async function findUserByEmail(email: string) {
	return User.findOne({ email, status: 'active' })
}

export async function findStudentUsers(mode: 'teachers' | 'students') {
	return User.find(
		{ status: 'active', isSuper: false, isAdmin: mode === 'teachers', isTeacher: mode === 'teachers' },
		'name lastName',
	)
}

export async function findUserByCredentials(
	name: string,
	lastName: string,
	dateOfBirth: { year: number; month: number; day: number },
) {
	return User.findOne({
		name,
		lastName,
		'dateOfBirth.year': dateOfBirth.year,
		'dateOfBirth.month': dateOfBirth.month,
		'dateOfBirth.day': dateOfBirth.day,
		status: 'active',
	})
}

export async function saveUser(user: HydratedDocument<IUser>) {
	return user.save()
}
