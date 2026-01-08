'use strict'

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import mongoose from 'mongoose'

import connectDB from '../config/db/db'
import { getAvailableCreditsForStudent, TEnrollmentPlan } from '../utils/credits-service'

type InputRow = Record<string, unknown>

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports')
const FILES = ['balances al 1010 with-ids Katy.xlsx']

function getFirst<T = unknown>(row: InputRow, keys: string[]): T | undefined {
	for (const key of keys) {
		const value = row[key]
		if (value !== undefined && value !== null && value !== '') {
			return value as T
		}
	}
	return undefined
}

function parseCredits(value: unknown): number | null {
	if (typeof value === 'number' && !Number.isNaN(value)) return value
	if (typeof value === 'string') {
		const clean = value.trim()
		if (!clean) return 0
		const num = Number(clean.replace(',', '.'))
		return Number.isFinite(num) && num >= 0 ? num : null
	}
	return null
}

function normalizePlan(value: unknown): TEnrollmentPlan | null {
	if (!value) return null
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!trimmed) return null
	const normalized = trimmed
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '')

	switch (normalized) {
		case 'basic':
			return 'Basic'
		case 'optimum':
		case 'optimo':
		case 'optimun':
			return 'Optimum'
		case 'plus':
			return 'Plus'
		case 'advanced':
		case 'advance':
			return 'Advanced'
		default:
			return null
	}
}

async function main() {
	await connectDB()

	const missingFiles: string[] = []
	const rowsToCheck: Array<{ file: string; row: InputRow }> = []

	for (const file of FILES) {
		const filePath = path.resolve(EXPORTS_DIR, file)
		if (!fs.existsSync(filePath)) {
			missingFiles.push(file)
			continue
		}

		const workbook = XLSX.readFile(filePath)
		const sheet = workbook.Sheets[workbook.SheetNames[0]]
		const rows = XLSX.utils.sheet_to_json<InputRow>(sheet, { defval: '' })

		rows.forEach((row) => rowsToCheck.push({ file, row }))
	}

	if (missingFiles.length) {
		console.warn('Archivos faltantes en exports/:', missingFiles)
	}

	const mismatches: Array<{
		studentId: string
		name: string
		file: string
		expectedCredits: number
		actualCredits: number
		expectedPlan?: string
		actualPlan?: string
	}> = []

	const skipped: Array<{ file: string; row: InputRow; reason: string }> = []

	for (const { file, row } of rowsToCheck) {
		const studentIdRaw = getFirst<string>(row, ['StudentId', 'studentId', 'ID', 'Id']) ?? ''
		const studentId = String(studentIdRaw).trim()
		const planRaw = getFirst(row, ['Plan', 'plan'])
		const expectedPlan = normalizePlan(planRaw) || undefined
		const expectedCredits = parseCredits(getFirst(row, ['Credits', 'credits', 'creditos', 'créditos']))

		if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
			skipped.push({ file, row, reason: 'StudentId inválido o vacío' })
			continue
		}

		if (expectedCredits === null || expectedCredits < 0) {
			skipped.push({ file, row, reason: 'Créditos inválidos' })
			continue
		}

		if (planRaw && !expectedPlan) {
			skipped.push({ file, row, reason: `Plan inválido: ${planRaw}` })
			continue
		}

		try {
			const creditsInfo = await getAvailableCreditsForStudent(studentId)
			const actualCredits = creditsInfo.totalCredits ?? creditsInfo.creditsFromAbsences
			const actualPlan = creditsInfo.plan

			if (actualCredits !== expectedCredits || (expectedPlan && expectedPlan !== actualPlan)) {
				mismatches.push({
					studentId,
					name: `${row.Nombre ?? ''} ${row.Apellido ?? ''}`.trim(),
					file,
					expectedCredits,
					actualCredits,
					expectedPlan,
					actualPlan,
				})
			}
		} catch (err) {
			skipped.push({ file, row, reason: (err as Error).message })
		}
	}

	if (mismatches.length) {
		console.log('--- MISMATCHES DETECTADOS ---')
		for (const mismatch of mismatches) {
			console.log(mismatch)
		}
		console.log(`Total mismatches: ${mismatches.length}`)
	} else {
		console.log('Todos los estudiantes coinciden con los créditos esperados.')
	}

	if (skipped.length) {
		console.log('--- REGISTROS OMITIDOS ---')
		for (const item of skipped) {
			console.log({ file: item.file, row: item.row, reason: item.reason })
		}
		console.log(`Total omitidos: ${skipped.length}`)
	}

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error verificando créditos desde Excel:', err)
	await mongoose.connection.close()
	process.exit(1)
})


