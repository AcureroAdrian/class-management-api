'use strict'

import { Document, Model, ObjectId, Schema, model } from 'mongoose'
import { TStatus } from '../utils/common-types'

export interface IRecoveryClass extends Document {
	karateClass: ObjectId
	student: ObjectId
	attendance: ObjectId
	// Indica si este booking consumió 1 crédito por ajuste
	usedAdjustment?: boolean
	date: {
		year: number
		month: number
		day: number
		hour: number
		minute: number
	}
	status: TStatus
	createdAt: Date
	updatedAt: Date
}

export interface IRecoveryClassDocument extends Partial<IRecoveryClass> {}

interface IRecoveryClassModel extends Model<IRecoveryClass> {}

const recoveryClassSchema = new Schema<IRecoveryClass>(
	{
		karateClass: {
			type: Schema.Types.ObjectId,
			ref: 'KarateClass',
			index: true,
		},
		student: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			index: true,
		},
		attendance: {
			type: Schema.Types.ObjectId,
			ref: 'Attendance',
			index: true,
		},
		usedAdjustment: {
			type: Boolean,
			default: false,
		},
		date: {
			year: {
				type: Number,
			},
			month: {
				type: Number,
			},
			day: {
				type: Number,
			},
			hour: {
				type: Number,
			},
			minute: {
				type: Number,
			},
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'deleted'],
			default: 'active',
		},
	},
	{ timestamps: true },
)

export const RecoveryClass: IRecoveryClassModel = model<IRecoveryClass, IRecoveryClassModel>(
	'RecoveryClass',
	recoveryClassSchema,
)
