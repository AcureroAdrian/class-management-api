'use strict'

const getAgeRangeByMinAndMax = (minAge: number, maxAge: number) => {
	let ageRange = ''

	if (minAge === 0 && maxAge === 100) {
		ageRange = 'All Ages'
	} else if (minAge === 0) {
		ageRange = `<${maxAge}`
	} else if (maxAge === 100) {
		ageRange = `+${minAge}`
	}
	return ageRange
}

export default getAgeRangeByMinAndMax
