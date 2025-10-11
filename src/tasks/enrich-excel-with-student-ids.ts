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
const INPUT_FILE_NAME = process.env.EXCEL_INPUT_FILE ?? 'corte-al-1001 no ids Katy.xlsx'
const OUTPUT_FILE_NAME = process.env.EXCEL_OUTPUT_FILE ?? 'corte-al-1001-with-ids Katy.xlsx'

const INPUT_FILE = path.resolve(EXPORTS_DIR, INPUT_FILE_NAME)
const OUTPUT_FILE = path.resolve(EXPORTS_DIR, OUTPUT_FILE_NAME)

type Row = {
	Apellido?: string
	Nombre?: string
	Plan?: string
	Credits?: number | string
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
	if (!fs.existsSync(INPUT_FILE)) {
		throw new Error(`Archivo de entrada no encontrado: ${INPUT_FILE}`)
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

	const workbook = XLSX.readFile(INPUT_FILE)
	const sheetName = workbook.SheetNames[0]
	const sheet = workbook.Sheets[sheetName]
	const rawRows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' })

	const headers = ['Apellido', 'Nombre', 'Plan', 'Credits', 'StudentId']
	const outputRows = rawRows.map((row) => {
		const lastName = String(row.Apellido ?? '').trim()
		const firstName = String(row.Nombre ?? '').trim()
		let studentId = ''

		if (firstName && lastName) {
			const key = `${normalizeName(firstName)}|${normalizeName(lastName)}`
			const match = uniqueMap.get(key)
			if (match) {
				studentId = match
			}
		}

		return {
			Apellido: row.Apellido ?? '',
			Nombre: row.Nombre ?? '',
			Plan: row.Plan ?? '',
			Credits: row.Credits ?? '',
			StudentId: studentId,
		}
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


