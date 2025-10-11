'use strict'

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import mongoose from 'mongoose'

import connectDB from '../config/db/db'
import { getAvailableCreditsForStudent, TEnrollmentPlan } from '../utils/credits-service'

type InputRow = {
	Apellido?: string | number
	Nombre?: string | number
	Plan?: string
	Credits?: number | string
	StudentId?: string
}

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports')
const FILES = ['corte-al-1001-with-ids.xlsx', 'corte-al-1001-with-ids Katy.xlsx']

function parseCredits(value: InputRow['Credits']): number | null {
	if (typeof value === 'number' && !Number.isNaN(value)) return value
	if (typeof value === 'string') {
		const clean = value.trim()
		if (!clean) return 0
		const num = Number(clean.replace(',', '.'))
		return Number.isFinite(num) && num >= 0 ? num : null
	}
	return null
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
		const studentId = String(row.StudentId ?? '').trim()
		const planValue = String(row.Plan ?? '').trim()
		const expectedCredits = parseCredits(row.Credits)

		if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
			skipped.push({ file, row, reason: 'StudentId inválido o vacío' })
			continue
		}

		if (expectedCredits === null || expectedCredits < 0) {
			skipped.push({ file, row, reason: 'Créditos inválidos' })
			continue
		}

		let expectedPlan: TEnrollmentPlan | undefined
		if (planValue) {
			if (['Basic', 'Optimum', 'Plus', 'Advanced'].includes(planValue)) {
				expectedPlan = planValue as TEnrollmentPlan
			} else {
				skipped.push({ file, row, reason: `Plan inválido: ${planValue}` })
				continue
			}
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


