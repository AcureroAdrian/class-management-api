'use strict'

import asyncHandler from 'express-async-handler'
import { NextFunction, Request, Response } from 'express'
import * as userRepository from '../repositories/user-repository'
import { validateToken } from '../utils/token-functions'
import { UNAUTHORIZED } from '../utils/http-server-status-codes'
import { IUser } from '../models/User'

export interface IRequest extends Request {
	user?: IUser
}

export const protect = asyncHandler(async (req: IRequest, res: Response, next: NextFunction) => {
	const isValidRequest = req.headers.authorization && req.headers.authorization?.startsWith('Bearer')

	if (!isValidRequest) {
		res.status(UNAUTHORIZED)
		throw new Error('Not authorized for this action.')
	}

	try {
		const sigToken = req.headers.authorization?.split(' ')[1]

		const decoded = validateToken(sigToken)

		if (typeof decoded === 'object' && decoded !== null && 'error' in decoded) {
			res.status(UNAUTHORIZED)
			throw new Error((decoded as { error: string }).error)
		}

		if (typeof decoded === 'string') {
			res.status(UNAUTHORIZED)
			throw new Error('Not Authorized, token not valid.')
		}

		const user = await userRepository.findUserById((decoded as { _id: string })?._id)

		if (!user) {
			res.status(UNAUTHORIZED)
			throw new Error('Not Authorized, user not found.')
		}

		req.user = user

		next()
	} catch (errorRequest) {
		res.status(UNAUTHORIZED)
		throw new Error((errorRequest as Error)?.message || 'Not Authorized, token not valid.')
	}
})

// export const recoveryProtect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
// 	const isValidRequest = req.headers.authorization && req.headers.authorization?.startsWith('Bearer')
// 	const sigToken = isValidRequest && req.headers.authorization?.split(' ')[1]
// 	const xSigParams = req.headers['x-sig-params']

// 	if (
// 		!isValidRequest ||
// 		!sigToken ||
// 		sigToken !== process.env.RECOVERY_TOKEN ||
// 		!xSigParams ||
// 		xSigParams !== 'sig-recovery'
// 	) {
// 		res.status(BAD_REQUEST)
// 		throw new Error('No autorizado para esta acción.')
// 	}

// 	next()
// })

// export const resetTokenProtect = asyncHandler(async (req: IRequest, res: Response, next: NextFunction) => {
// 	const isValidRequest = req.headers.authorization && req.headers.authorization?.startsWith('Bearer')
// 	const sigToken = isValidRequest && req.headers.authorization?.split(' ')[ONE]

// 	const decoded = validateToken(sigToken)

// 	if (decoded?.error?.length) {
// 		res.status(BAD_REQUEST).json({ success: false, message: 'Token de restablecimiento no es válido o ha expirado' })
// 		return
// 	}
// 	const user = await userRepository.findUserByEmailWithAllData(decoded.email)

// 	if (!user) {
// 		res.status(BAD_REQUEST).json({ success: false, message: 'Usuario no encontrado' })
// 		return
// 	}

// 	if (user.resetPasswordToken !== sigToken || user.resetPasswordExpire < new Date()) {
// 		res.status(400).json({ success: false, message: 'Token de restablecimiento no es válido o ha expirado' })
// 		return
// 	}

// 	req.user = user
// 	next()
// })
