'use strict'

import { Document, Model, ObjectId, Schema, model } from 'mongoose'
import { TStatus } from '../utils/common-types'

export interface IHoliday extends Document {
	date: {
		year: number
		month: number
		day: number
	}
	user: ObjectId
	status: TStatus
	createdAt: Date
	updatedAt: Date
}

export interface IHolidayDocument extends Partial<IHoliday> {}

interface IHolidayModel extends Model<IHoliday> {}

const holidaySchema = new Schema<IHoliday>(
	{
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
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'deleted'],
			default: 'active',
		},
	},
	{ timestamps: true },
)

export const Holiday: IHolidayModel = model<IHoliday, IHolidayModel>('Holiday', holidaySchema)
