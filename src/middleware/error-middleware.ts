'use strict'

import { ErrorRequestHandler } from 'express'
import { logger } from '../logger'
import { INTERNAL_SERVER_ERROR, OK } from '../utils/http-server-status-codes'

// eslint-disable-next-line
const errorMiddleware: ErrorRequestHandler = async (err, req, res, next) => {
	const statusCode = res.statusCode === OK ? INTERNAL_SERVER_ERROR : res.statusCode

	if (process.env.NODE_ENV === 'development') {
		logger.log({
			level: 'error',
			message: 'Error in request handler',
			error: err,
		})
	}

	res.status(statusCode)
	res.json({
		message: err.message,
		stack: process.env.NODE_ENV === 'production' ? null : err.stack,
	})
}

export default errorMiddleware
