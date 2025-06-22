import { Request, Response, NextFunction } from 'express'
import { UnauthorizedRequest } from '../errors'

const API_KEY = process.env.API_KEY

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const apiKey = req.get('x-api-key')
	if (!apiKey || apiKey !== API_KEY) {
		return next(new UnauthorizedRequest('API Key no válida o no proporcionada.'))
	}
	next()
}
