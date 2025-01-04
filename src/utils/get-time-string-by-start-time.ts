'use strict'

const getTimeStringByStartTime = (hour: number, minute: number) => {
	const hours = hour > 12 ? hour - 12 : hour
	const minutes = minute.toString().padStart(2, '0')
	const period = hour > 12 ? 'pm' : 'am'

	return `${hours}:${minutes} ${period}`
}

export default getTimeStringByStartTime
