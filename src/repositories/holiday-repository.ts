'use strict'

import { HydratedDocument } from 'mongoose'
import { Holiday, IHoliday, IHolidayDocument } from '../models/Holiday'

export async function createHoliday(holiday: IHolidayDocument) {
	return Holiday.create(holiday)
}

export async function findHolidayByDate(year: number, month: number, day: number) {
	return Holiday.findOne({ status: 'active', 'date.year': year, 'date.month': month, 'date.day': day })
}

export async function findHolidayById(holidayId: string) {
	return Holiday.findById(holidayId)
}

export async function saveHoliday(holiday: HydratedDocument<IHoliday>) {
	return holiday.save()
}

export async function getAllHolidays() {
	return Holiday.find({ status: 'active' }).select('date').lean()
}
