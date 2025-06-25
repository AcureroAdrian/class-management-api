'use strict'

import { Response, NextFunction } from 'express'
import { UNAUTHORIZED } from '../utils/http-server-status-codes'
import { IRequest } from './auth-middleware'

export const forSuperUser = (req: IRequest, res: Response, next: NextFunction) => {
	if (!req?.user?.isSuper) {
		res.status(UNAUTHORIZED)
		throw new Error('Not authorized for this action.')
	}

	next()
}
export const forUserAdmin = (req: IRequest, res: Response, next: NextFunction) => {
	if (req?.user?.isSuper) {
		return next()
	}

	if (!req?.user?.isAdmin) {
		res.status(UNAUTHORIZED)
		throw new Error('Not authorized for this action.')
	}

	next()
}
export const forUserStudent = (req: IRequest, res: Response, next: NextFunction) => {
	if (req?.user?.isSuper || req?.user?.isAdmin) {
		return next()
	}

	if (req?.user?.isTeacher) {
		res.status(UNAUTHORIZED)
		throw new Error('Not authorized for this action.')
	}

	next()
}
