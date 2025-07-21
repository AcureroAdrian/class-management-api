'use strict'

import { Document, Model, ObjectId, Schema, model } from 'mongoose'
import { TDaysOfWeek, TLocation, TStatus, TUserLevel } from '../utils/common-types'

export interface IKarateClass extends Document {
	name: string
	minAge: number
	maxAge: number
	levels: TUserLevel[]
	weekDays: TDaysOfWeek[]
	startTime: { hour: number; minute: number }
	students: ObjectId[]
	location?: TLocation
	description: string
	recoveryClasses: ObjectId[]
	status: TStatus
	createdAt: Date
	updatedAt: Date
}

export interface IKarateClassDocument extends Partial<IKarateClass> {}

interface IKarateClassModel extends Model<IKarateClass> {}

const karateClassSchema = new Schema<IKarateClass>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		minAge: {
			type: Number,
			required: true,
		},
		maxAge: {
			type: Number,
			required: true,
		},
		levels: [
			{
				type: String,
				required: true,
				enum: ['beginner', 'novice', 'intermediate', 'advanced', 'elite'],
			},
		],
		weekDays: [
			{
				type: String,
				enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
			},
		],
		startTime: {
			hour: {
				type: Number,
			},
			minute: {
				type: Number,
			},
		},
		students: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		location: {
			type: String,
			enum: ['spring', 'katy'],
		},
		description: {
			type: String,
		},
		recoveryClasses: [
			{
				type: Schema.Types.ObjectId,
				ref: 'RecoveryClass',
			},
		],
		status: {
			type: String,
			enum: ['active', 'inactive', 'deleted'],
			default: 'active',
		},
	},
	{ timestamps: true },
)

export const KarateClass: IKarateClassModel = model<IKarateClass, IKarateClassModel>('KarateClass', karateClassSchema)
