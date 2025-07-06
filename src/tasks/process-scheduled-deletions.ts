'use strict'

import 'dotenv/config'
import 'colors'
import mongoose from 'mongoose'
import connectDB from '../config/db/db'
import { User } from '../models/User'

async function processScheduledDeletions() {
	console.log('Starting scheduled deletion process...')
	try {
		const now = new Date()
		
		const usersToDelete = await User.find({
			scheduledDeletionDate: { $lte: now },
			status: 'active'
		})

		if (usersToDelete.length === 0) {
			console.log('No scheduled deletions to process.')
			return
		}

		for (const user of usersToDelete) {
			user.status = 'deleted'
			user.scheduledDeletionDate = undefined
			await user.save()
		}

		console.log(`Processed ${usersToDelete.length} scheduled user deletions.`)
	} catch (error) {
		console.error('Error processing scheduled deletions:', error)
	}
}

const run = async () => {
    await connectDB()
    await processScheduledDeletions()
    await mongoose.disconnect()
    console.log('Scheduled deletion process finished. Disconnecting from DB.')
    process.exit(0)
}

run() 