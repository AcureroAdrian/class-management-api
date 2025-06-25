'use strict'

import mongoose from 'mongoose'

export const verifyEmail = (email: string) => {
	const emailRex =
		/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

	return emailRex.test(email)
}

export const passwordComplexValidator = (password: string) => {
	const result = {
		error: false,
		message: '',
	}

	const special = /^(?=.*[.,!@#$^&*()_-]).{1,}$/
	const num = /^(?=.*\d).{1,}$/
	const lowerCase = /^(?=.*[a-z]).{1,}$/
	const upperCase = /^(?=.*[A-Z]).{1,}$/
	const character = /^.{6,}$/

	if (!special.test(password)) {
		result.error = true
		result.message = 'La nueva contraseña debe tener al menos un caracter especial.'
	}
	if (!num.test(password)) {
		result.error = true
		result.message = 'La nueva contraseña debe tener al menos un número.'
	}
	if (!lowerCase.test(password)) {
		result.error = true
		result.message = 'La nueva contraseña debe tener al menos una letra minuscula.'
	}
	if (!upperCase.test(password)) {
		result.error = true
		result.message = 'La nueva contraseña debe tener al menos una letra mayuscula.'
	}
	if (!character.test(password)) {
		result.error = true
		result.message = 'La nueva contraseña debe tener al menos 6 digitos.'
	}

	return result
}

export const mongoIdValidator = (id: string) => {
	return mongoose.Types.ObjectId.isValid(id)
}
