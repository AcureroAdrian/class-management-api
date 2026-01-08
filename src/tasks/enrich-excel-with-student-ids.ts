'use strict'

import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'

import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import connectDB from '../config/db/db'
import { User } from '../models/User'

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports')
const INPUT_FILE_NAME = process.env.EXCEL_INPUT_FILE ?? 'Spring oct 2.xlsx'
const OUTPUT_FILE_NAME = process.env.EXCEL_OUTPUT_FILE ?? 'Spring oct 2 with-ids.xlsx'

const INPUT_FILE = path.resolve(EXPORTS_DIR, INPUT_FILE_NAME)
const OUTPUT_FILE = path.resolve(EXPORTS_DIR, OUTPUT_FILE_NAME)

type Row = Record<string, unknown>

function getFirstValue<T = unknown>(row: Row, keys: string[]): T | undefined {
	for (const key of keys) {
		const value = row[key]
		if (value !== undefined && value !== null && value !== '') {
			return value as T
		}
	}
	return undefined
}

function normalizeName(value: string | undefined | null): string {
	if (!value) return ''
	return value
		.normalize('NFD')
		.replace(/[^\p{L}\p{N}\s'-]/gu, '')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ')
}

async function main() {
	// Resolver archivo de entrada permitiendo tanto en exports/ como en la raíz del proyecto
	const candidateInputs = [
		INPUT_FILE,
		path.resolve(process.cwd(), INPUT_FILE_NAME),
		path.isAbsolute(INPUT_FILE_NAME) ? INPUT_FILE_NAME : '',
	].filter(Boolean) as string[]

	let resolvedInput = ''
	for (const candidate of candidateInputs) {
		if (fs.existsSync(candidate)) {
			resolvedInput = candidate
			break
		}
	}

	if (!resolvedInput) {
		throw new Error(
			`Archivo de entrada no encontrado. Intentado: ${candidateInputs.join(' | ')}`
		)
	}

	await connectDB()

	const students = await User.find({
		isAdmin: { $ne: true },
		isTeacher: { $ne: true },
		isSuper: { $ne: true },
	})
		.select(['_id', 'name', 'lastName'])
		.lean()

	const candidateMap = new Map<string, string[]>()

	for (const student of students) {
		const key = `${normalizeName(student.name)}|${normalizeName(student.lastName)}`
		if (!key.includes('|')) continue
		const existing = candidateMap.get(key) || []
		existing.push(student._id.toString())
		candidateMap.set(key, existing)
	}

	const uniqueMap = new Map<string, string>()
	const ambiguousKeys: string[] = []

	for (const [key, ids] of candidateMap.entries()) {
		if (ids.length === 1) {
			uniqueMap.set(key, ids[0])
		} else {
			ambiguousKeys.push(key)
		}
	}

	if (ambiguousKeys.length) {
		console.log('Claves ambiguas (no se asignará ID automáticamente):')
		ambiguousKeys.forEach((key) => console.log(` - ${key}`))
	}

	const workbook = XLSX.readFile(resolvedInput)
	const sheetName = workbook.SheetNames[0]
	const sheet = workbook.Sheets[sheetName]
	const rawRows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' })

	// Detectar encabezados según la nueva distribución (minúsculas) o la anterior (capitalizada)
	const useLowercaseHeaders = rawRows.length
		? Object.prototype.hasOwnProperty.call(rawRows[0], 'apellido') ||
		  Object.prototype.hasOwnProperty.call(rawRows[0], 'nombre')
		: false

	const baseHeaders = useLowercaseHeaders
		? ['apellido', 'nombre', 'plan', 'creditos']
		: ['Apellido', 'Nombre', 'Plan', 'Credits']

	const headers = [...baseHeaders, 'StudentId']
	const outputRows = rawRows.map((row) => {
		const lastName = String(getFirstValue(row, ['Apellido', 'apellido']) ?? '').trim()
		const firstName = String(getFirstValue(row, ['Nombre', 'nombre']) ?? '').trim()
		let studentId = ''

		if (firstName && lastName) {
			const key = `${normalizeName(firstName)}|${normalizeName(lastName)}`
			const match = uniqueMap.get(key)
			if (match) {
				studentId = match
			}
		}

		// Construir el objeto de salida respetando el nombre/origen de los encabezados
		const result: Record<string, string | number> = {}
		for (const h of baseHeaders) {
			if (h === 'Apellido' || h === 'apellido') {
				result[h] = (getFirstValue(row, ['Apellido', 'apellido']) as any) ?? ''
			} else if (h === 'Nombre' || h === 'nombre') {
				result[h] = (getFirstValue(row, ['Nombre', 'nombre']) as any) ?? ''
			} else if (h === 'Plan' || h === 'plan') {
				result[h] = (getFirstValue(row, ['Plan', 'plan']) as any) ?? ''
			} else if (
				h === 'Credits' ||
				h === 'creditos'
			) {
				result[h] =
					(getFirstValue(row, ['Credits', 'credits', 'creditos', 'Créditos', 'créditos']) as any) ?? ''
			}
		}
		result['StudentId'] = studentId
		return result
	})

	if (!fs.existsSync(EXPORTS_DIR)) {
		fs.mkdirSync(EXPORTS_DIR, { recursive: true })
	}

	const outWorkbook = XLSX.utils.book_new()
	const outSheet = XLSX.utils.json_to_sheet(outputRows, { header: headers })
	XLSX.utils.book_append_sheet(outWorkbook, outSheet, 'Reporte')
	XLSX.writeFile(outWorkbook, OUTPUT_FILE)

	console.log(`Archivo generado: ${OUTPUT_FILE}`)
	console.log(`Filas procesadas: ${outputRows.length}`)

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error generando Excel con IDs:', err)
	await mongoose.connection.close()
	process.exit(1)
})


