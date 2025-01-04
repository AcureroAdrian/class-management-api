'use strict'

import { Document, Model, ObjectId, Schema, model } from 'mongoose'
import { TDaysOfWeek, TStatus, TUserLevel } from '../utils/common-types'

export interface IKarateClass extends Document {
	name: string
	minAge: number
	maxAge: number
	levels: TUserLevel[]
	schedule: [
		{
			day: TDaysOfWeek
			startTime: {
				hour: number
				minute: number
			}
		},
	]
	students: ObjectId[]
	description: string
	status: TStatus
	createdAt: Date
	updatedAt: Date
}

export interface IKarateClassDocument extends Partial<IKarateClass> {}

interface IKarateClassModel extends Model<IKarateClass> {}

const classSchema = new Schema<IKarateClass>(
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
				enum: ['novice', 'beginner', 'intermediate', 'elite'],
			},
		],
		schedule: [
			{
				day: {
					type: String,
					required: true,
					enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
				},
				startTime: {
					hour: {
						type: Number,
						required: true,
					},
					minute: {
						type: Number,
						required: true,
					},
				},
			},
		],
		students: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		description: {
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

export const KarateClass: IKarateClassModel = model<IKarateClass, IKarateClassModel>('KarateClass', classSchema)
