'use strict'

import { Response, NextFunction } from 'express'
import { UNAUTHORIZED } from '../utils/http-server-status-codes'
import { IRequest } from './auth-middleware'

export const forUserAdmin = (req: IRequest, res: Response, next: NextFunction) => {
	if (!req?.user?.isAdmin) {
		res.status(UNAUTHORIZED)
		throw new Error('Not authorized for this action.')
	}

	next()
}
export const forUserStudent = (req: IRequest, res: Response, next: NextFunction) => {
	if (req?.user?.isAdmin || req?.user?.isTeacher) {
		res.status(UNAUTHORIZED)
		throw new Error('Not authorized for this action.')
	}

	next()
}
