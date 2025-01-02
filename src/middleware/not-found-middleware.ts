'use strict'

import { NextFunction, Request, Response } from 'express'
import { logger } from '../logger'
import { NOT_FOUND } from '../utils/http-server-status-codes'

const notFound = (req: Request, res: Response, next: NextFunction) => {
	logger.log({
		level: 'info',
		message: 'Route not found: ' + req.url,
	})
	const error = new Error(`Route not found - ${req.originalUrl}`)
	res.status(NOT_FOUND)
	next(error)
}

export default notFound
