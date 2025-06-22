'use strict'

import cron from 'node-cron'
import { User } from '../models/User'

// Función para procesar eliminaciones programadas
async function processScheduledDeletions() {
	try {
		const now = new Date()
		
		// Buscar usuarios con eliminación programada para hoy o antes
		const usersToDelete = await User.find({
			scheduledDeletionDate: { $lte: now },
			status: 'active'
		})

		if (usersToDelete.length === 0) {
			console.log('No scheduled deletions to process')
			return
		}

		// Eliminar usuarios programados
		for (const user of usersToDelete) {
			user.status = 'deleted'
			user.scheduledDeletionDate = undefined
			await user.save()
		}

		console.log(`Processed ${usersToDelete.length} scheduled user deletions`)
	} catch (error) {
		console.error('Error processing scheduled deletions:', error)
	}
}

// Configurar cron job para ejecutar cada 6 horas
export function startScheduledDeletionCron() {
	// Ejecutar cada 6 horas (0 */6 * * *)
	cron.schedule('0 */6 * * *', processScheduledDeletions, {
		timezone: "America/Chicago"
	})

	console.log('Scheduled deletion cron job started - runs every 6 hours')
}