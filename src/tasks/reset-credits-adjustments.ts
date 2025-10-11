'use strict'

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db/db'
import { User } from '../models/User'

async function main() {
	await connectDB()

	const filter = {
		isSuper: false,
		isAdmin: false,
		isTeacher: false,
	}

	const result = await User.updateMany(filter, { $set: { recoveryCreditsAdjustment: 0 } })
	console.log(`Ajustes en 0 para estudiantes: ${result.modifiedCount}`)

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error(err)
	await mongoose.connection.close()
	process.exit(1)
})


