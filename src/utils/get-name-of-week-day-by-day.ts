import { TDaysOfWeek } from './common-types'

type TGetNameOfWeekDayByDay = (day: Date) => TDaysOfWeek

const getNameOfWeekDayByDay: TGetNameOfWeekDayByDay = (day: Date) => {
	const weekDay = day.toLocaleString('en-US', { weekday: 'long', timeZone: 'America/Chicago' })
	return weekDay.toLowerCase() as TDaysOfWeek
}

export default getNameOfWeekDayByDay
