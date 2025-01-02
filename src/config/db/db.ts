'use strict'

import mongoose, { ConnectOptions } from 'mongoose'

const connectDB = async () => {
	try {
		mongoose.set('strictQuery', false)
		const conn = await mongoose.connect(process.env.MONGO_URI || '', {
			useUnifiedTopology: true,
			useNewUrlParser: true,
		} as ConnectOptions)
		console.log(`MongoDB Connected: ${conn.connection.host}`.magenta.underline)
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`.red.underline.bold)
		process.exit(1)
	}
}

export default connectDB
