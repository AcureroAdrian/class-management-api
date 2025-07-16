import { Request, Response } from 'express'

export const keepAlive = async (req: Request, res: Response) => {
	try {
		res.status(200).json({
			status: 'success',
			message: 'Server is running',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		})
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: 'Health check failed'
		})
	}
} 