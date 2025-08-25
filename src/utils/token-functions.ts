'use strict'

import dotenv from 'dotenv'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { logger } from '../logger'
import { IUser } from '../models/User'

dotenv.config()
const secret = process.env.SECRET

//TIME FOR EXPIRE ACCESSTOKEN
const defaultTime = '30d'

interface ITokenData extends Partial<IUser> {}

export const validateToken: (token?: string) => { error?: string } | string | JwtPayload = (token?: string) => {
	if (!token || !secret) {
		return { error: 'Not Authorized, no token provided' }
	}

	try {
		const data = jwt.verify(token, secret)
		return data
	} catch (err) {
		logger.log({
			level: 'info',
			message: err.message === 'jwt expired' ? 'Not Authorized, token expired' : err.message,
		})
		return { error: err.message === 'jwt expired' ? 'Not Authorized, token expired' : err.message }
	}
}

// Ahora el token generado NO tiene expiración
export const generateToken = (user: ITokenData) => {
	if (!secret) {
		return { error: 'Not Authorized, no secret provided' }
	}

	try {
		const token = jwt.sign(user, secret)
		return token
	} catch (error) {
		return { error: error?.message || 'Generate token failed' }
	}
}
