'use strict'

import { Document, Model, ObjectId, Schema, model } from 'mongoose'
import { TAttendanceStatus, TStatus } from '../utils/common-types'

export interface IAttendance {
	student: ObjectId
	attendanceStatus: TAttendanceStatus
	observations: string
}

export interface IStudentAttendance extends Document {
	karateClass: ObjectId
	date: {
		year: number
		month: number
		day: number
		hour: number
		minute: number
	}
	attendance: IAttendance[]
	status: TStatus
	createdAt: Date
	updatedAt: Date
}

export interface IStudentAttendanceDocument extends Partial<IStudentAttendance> {}

interface IStudentAttendanceModel extends Model<IStudentAttendance> {}

const studentAttendanceSchema = new Schema<IStudentAttendance>(
	{
		karateClass: {
			type: Schema.Types.ObjectId,
			ref: 'KarateClass',
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
		attendance: [
			{
				student: {
					type: Schema.Types.ObjectId,
					ref: 'User',
				},
				attendanceStatus: {
					type: String,
					enum: ['present', 'absent', 'late'],
				},
				observations: {
					type: String,
				},
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

export const StudentAttendance: IStudentAttendanceModel = model<IStudentAttendance, IStudentAttendanceModel>(
	'StudentAttendance',
	studentAttendanceSchema,
)
