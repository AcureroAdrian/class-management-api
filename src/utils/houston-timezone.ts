'use strict'

/**
 * Utilidades para manejar fechas en la zona horaria de Houston (America/Chicago)
 */

/**
 * Obtiene la fecha actual en la zona horaria de Houston
 * @returns Date en zona horaria de Houston
 */
export const getCurrentDateInHouston = (): Date => {
	const now = new Date()
	const houstonTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
	return houstonTime
}

/**
 * Crea una fecha específica en la zona horaria de Houston con hora, minuto, segundo y milisegundo en 0
 * @param year - Año
 * @param month - Mes (1-12)
 * @param day - Día (1-31)
 * @returns Date en zona horaria de Houston con tiempo en 00:00:00.000
 */
export const createHoustonDate = (year: number, month: number, day: number): Date => {
	// Crear fecha directamente con los parámetros dados
	const cleanDate = new Date(year, month - 1, day)
	
	// Asegurar que la hora, minuto, segundo y milisegundo sean 0
	cleanDate.setHours(0, 0, 0, 0)
	
	return cleanDate
}

/**
 * Compara dos fechas basándose únicamente en el día (año, mes, día) en zona horaria de Houston
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns true si las fechas son el mismo día, false en caso contrario
 */
export const isSameDayInHouston = (date1: Date, date2: Date): boolean => {
	const houston1 = new Date(date1.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
	const houston2 = new Date(date2.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
	
	return houston1.getFullYear() === houston2.getFullYear() &&
		   houston1.getMonth() === houston2.getMonth() &&
		   houston1.getDate() === houston2.getDate()
}

/**
 * Obtiene el día anterior en la zona horaria de Houston
 * @param date - Fecha de referencia (opcional, por defecto usa la fecha actual)
 * @returns Date del día anterior en zona horaria de Houston
 */
export const getPreviousDayInHouston = (date?: Date): Date => {
	const referenceDate = date || getCurrentDateInHouston()
	
	// Restar un día
	const previousDay = new Date(referenceDate)
	previousDay.setDate(previousDay.getDate() - 1)
	
	// Asegurar que la hora, minuto, segundo y milisegundo sean 0
	previousDay.setHours(0, 0, 0, 0)
	
	return previousDay
} 