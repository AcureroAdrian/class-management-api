import dotenv from 'dotenv'
import connectDB from './config/db/db'
import app from './config/server/server-config'
import { logger } from './logger'

const result = dotenv.config()
if (result.error) {
	dotenv.config({ path: '.env' })
}

const PORT = process.env.PORT || 8000
connectDB()
	.then(() => {
		app.listen(PORT, (): void => {
			console.log(
				'\x1b[36m%s\x1b[0m', // eslint-disable-line
				`🌏 Express server started at http://localhost:${PORT}`.yellow.bold,
			)
		})
	})
	.catch((err) => {
		logger.log({
			level: 'error',
			message: `Failed to connect to MongoDB: ${err.message}`,
		})
		process.exit(1)
	})
