'use strict'

import { Document, Model, Schema, model } from 'mongoose'
import { TStatus, TUserLevel } from '../utils/common-types'

export interface IUser extends Document {
	userId: string
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
	isSuper: boolean
	isAdmin: boolean
	isTeacher: boolean
	isTrial?: boolean
	scheduledDeletionDate?: Date
	recoveryCreditsAdjustment?: number
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
		userId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			uppercase: true,
			minlength: [6, 'User ID must be at least 6 characters long'],
			match: [/^[A-Z0-9]+$/, 'User ID must contain only letters and numbers'],
		},
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
			enum: ['beginner', 'novice', 'intermediate', 'advanced', 'elite'],
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
		isSuper: {
			type: Boolean,
			default: false,
		},
		isAdmin: {
			type: Boolean,
			default: false,
		},
		isTeacher: {
			type: Boolean,
			default: false,
		},
		isTrial: {
			type: Boolean,
			default: false,
		},
		scheduledDeletionDate: {
			type: Date,
		},
		recoveryCreditsAdjustment: {
			type: Number,
			default: 0,
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
