'use strinct'

import { TDaysOfWeek, TUserLevel } from './common-types'

type TShortDaysOfWeek = {
	[K in TDaysOfWeek]: string
}

export const shortDaysOfWeek: TShortDaysOfWeek = {
	monday: 'Mon',
	tuesday: 'Tue',
	wednesday: 'Wed',
	thursday: 'Thu',
	friday: 'Fri',
	saturday: 'Sat',
	sunday: 'Sun',
}

type TShortLevels = {
	[K in TUserLevel]: string
}

export const shortLevels: TShortLevels = {
	novice: 'Nov',
	beginner: 'Beg',
	intermediate: 'Int',
	elite: 'Elit',
}
