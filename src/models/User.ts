'use strict'

import { Document, Model, Schema, model } from 'mongoose'
import { hashSync, genSaltSync, compareSync } from 'bcrypt'
import { TStatus, TUserLevel } from '../utils/common-types'

export interface IUser extends Document {
	email: string
	password: string
	name: string
	lastName: string
	dateOfBirth: Date
	level: TUserLevel
	isAdmin: boolean
	avatar?: string
	status: TStatus
	encryptPassword: (password: string) => string
	validPassword: (password: string) => boolean
	createdAt: Date
	updatedAt: Date
}

export interface IUserDocument extends Partial<IUser> {}

interface IUserModel extends Model<IUser> {}

const userSchema = new Schema<IUser>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		dateOfBirth: {
			type: Date,
			required: true,
		},
		level: {
			type: String,
			required: true,
			enum: ['novice', 'beginner', 'intermediate', 'elite'],
			default: 'novice',
		},
		email: {
			type: String,
			unique: true,
			required: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		isAdmin: {
			type: Boolean,
			default: false,
		},
		avatar: {
			type: String,
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'deleted'],
			default: 'active',
		},
	},
	{ timestamps: true },
)

userSchema.methods.encryptPassword = function (password: string): string {
	return hashSync(password, genSaltSync(10))
}

userSchema.methods.validPassword = function (password: string): boolean {
	return compareSync(password, this.password)
}

export const User: IUserModel = model<IUser, IUserModel>('User', userSchema)
