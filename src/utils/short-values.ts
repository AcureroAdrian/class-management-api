'use strinct'

import { TDaysOfWeek, TUserLevel } from './common-types'

type TShortDaysOfWeek = Record<TDaysOfWeek, string>

export const shortDaysOfWeek: TShortDaysOfWeek = {
	monday: 'Mon',
	tuesday: 'Tue',
	wednesday: 'Wed',
	thursday: 'Thu',
	friday: 'Fri',
	saturday: 'Sat',
	sunday: 'Sun',
}

type TShortLevels = Record<TUserLevel, string>

export const shortLevels: TShortLevels = {
	beginner: 'Beg',
	novice: 'Nov',
	intermediate: 'Int',
	advanced: 'Adv',
	elite: 'Elit',
}
