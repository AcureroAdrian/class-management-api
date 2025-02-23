'use strict'

import { Document, Model, Schema, model } from 'mongoose'
import { TStatus, TUserLevel } from '../utils/common-types'

export interface IUser extends Document {
	name: string
	lastName: string
	dateOfBirth?: {
		year: number
		month: number
		day: number
	}
	email?: string
	phone?: string
	notes?: string
	level?: TUserLevel
	avatar?: string
	isAdmin: boolean
	isTeacher: boolean
	notifications?: {
		title: string
		body: string
	}[]
	status: TStatus
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
			year: {
				type: Number,
			},
			month: {
				type: Number,
			},
			day: {
				type: Number,
			},
		},
		level: {
			type: String,
			enum: ['novice', 'beginner', 'intermediate', 'elite'],
		},
		email: {
			type: String,
			trim: true,
		},
		phone: {
			type: String,
			trim: true,
		},
		notes: {
			type: String,
			trim: true,
		},
		isAdmin: {
			type: Boolean,
			default: false,
		},
		isTeacher: {
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

export const User: IUserModel = model<IUser, IUserModel>('User', userSchema)
