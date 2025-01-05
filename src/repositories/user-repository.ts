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

export async function findStudentUsers() {
	return User.find({ status: 'active', isAdmin: false }, 'name lastName')
}

export async function findUserByCredentials(name: string, lastName: string, dateOfBirth: string) {
	return User.findOne({ name, lastName, dateOfBirth: new Date(dateOfBirth), status: 'active' })
}

export async function saveUser(user: HydratedDocument<IUser>) {
	return user.save()
}
