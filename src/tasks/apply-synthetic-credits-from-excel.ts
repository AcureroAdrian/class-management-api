'use strict'

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import mongoose from 'mongoose'

import connectDB from '../config/db/db'
import { User } from '../models/User'
import { KarateClass } from '../models/KarateClass'
import { StudentAttendance } from '../models/StudentAttendance'
import { enforceOverflowAfterPlanDowngrade, TEnrollmentPlan } from '../utils/credits-service'

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports')
const INPUT_FILE_NAME = process.env.EXCEL_INPUT_FILE ?? 'Spring oct 2 with-ids.xlsx'
const INPUT_FILE = path.resolve(EXPORTS_DIR, INPUT_FILE_NAME)
const SYNTHETIC_CLASS_NAME = 'Synthetic Credit Seed Class'
const VALID_PLANS: TEnrollmentPlan[] = ['Basic', 'Optimum', 'Plus', 'Advanced']

type InputRow = Record<string, unknown>

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
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const clean = value.trim()
		if (!clean) return 0
		const num = Number(clean.replace(',', '.'))
		return Number.isFinite(num) ? num : null
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
		case 'optimumplan':
		case 'optimun':
		case 'optimumd':
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

async function adjustStudentCredits(
	studentId: string,
	plan: TEnrollmentPlan,
	desiredCredits: number,
	syntheticClassId: mongoose.Types.ObjectId,
) {
	const student = await User.findById(studentId)
	if (!student) {
		console.warn(`Estudiante no encontrado -> ${studentId}`)
		return
	}

	if (student.enrollmentPlan !== plan) {
		student.enrollmentPlan = plan
		await student.save()
		console.log(`Plan actualizado a ${plan} para ${student.name} ${student.lastName}`)
	}

	await enforceOverflowAfterPlanDowngrade(studentId, plan)

	const pipeline: any[] = [
		{ $match: { karateClass: syntheticClassId, status: 'active' } },
		{
			$addFields: {
				attendanceDate: {
					$dateFromParts: {
						year: '$date.year',
						month: '$date.month',
						day: '$date.day',
						hour: '$date.hour',
						minute: '$date.minute',
					},
				},
			},
		},
		{ $unwind: '$attendance' },
		{
			$match: {
				'attendance.student': new mongoose.Types.ObjectId(studentId),
				'attendance.attendanceStatus': { $in: ['absent', 'sick'] },
				'attendance.isDayOnly': { $ne: true },
				'attendance.isRecovery': { $ne: true },
			},
		},
		{ $sort: { attendanceDate: 1 } },
		{
			$project: {
				rootId: '$_id',
				subId: '$attendance._id',
				isOverflowAbsence: '$attendance.isOverflowAbsence',
			},
		},
	]

	const attendances = await StudentAttendance.aggregate(pipeline)
	const countable = attendances.filter((doc: any) => !doc.isOverflowAbsence)
	const currentCredits = countable.length

	if (currentCredits <= desiredCredits) {
		console.log(`Sin cambios -> ${studentId}. Créditos actuales ${currentCredits}, objetivo ${desiredCredits}`)
		return
	}

	const toReduce = currentCredits - desiredCredits
	const targets = countable.slice(0, toReduce)

	const updates = targets.map((item: any) => ({
		updateOne: {
			filter: { _id: item.rootId, 'attendance._id': item.subId },
			update: {
				$set: {
					'attendance.$.attendanceStatus': 'present',
					'attendance.$.isOverflowAbsence': false,
					'attendance.$.isDayOnly': false,
					'attendance.$.isRecovery': false,
				},
				$unset: {
					'attendance.$.overflowReason': '',
				},
			},
		},
	}))

	if (updates.length === 0) {
		console.log(`No hay actualizaciones -> ${studentId}`)
		return
	}

	const result = await StudentAttendance.bulkWrite(updates as any)
	const matched = (result as any).matchedCount ?? (result as any).nMatched
	const modified = (result as any).modifiedCount ?? (result as any).nModified
	console.log(`Actualizado ${studentId} -> matched ${matched}, modified ${modified}`)
}

async function main() {
	if (!fs.existsSync(INPUT_FILE)) {
		throw new Error(`Archivo de entrada no encontrado: ${INPUT_FILE}`)
	}

	await connectDB()

	const syntheticClass = await KarateClass.findOne({ name: SYNTHETIC_CLASS_NAME }).select('_id')
	if (!syntheticClass) {
		throw new Error(`Clase sintética '${SYNTHETIC_CLASS_NAME}' no encontrada`)
	}

	const syntheticClassId = syntheticClass._id as unknown as mongoose.Types.ObjectId

	const workbook = XLSX.readFile(INPUT_FILE)
	const sheet = workbook.Sheets[workbook.SheetNames[0]]
	const rows = XLSX.utils.sheet_to_json<InputRow>(sheet, { defval: '' })

	console.log(`Filas en archivo: ${rows.length}`)

	for (const row of rows) {
		const studentIdRaw = getFirst<string>(row, ['StudentId', 'studentId', 'ID', 'Id']) ?? ''
		const studentId = String(studentIdRaw).trim()
		const planRaw = getFirst(row, ['Plan', 'plan'])
		const normalizedPlan = normalizePlan(planRaw)
		const creditsRaw = getFirst(row, ['Credits', 'credits', 'creditos', 'créditos'])
		const creditsValue = parseCredits(creditsRaw)

		if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
			console.warn('Saltando fila por StudentId inválido', row)
			continue
		}

		if (!normalizedPlan) {
			console.warn(`Plan inválido para ${studentId}: ${planRaw}`)
			continue
		}

	if (creditsValue === null) {
			console.warn(`Créditos inválidos para ${studentId}: ${row.Credits}`)
			continue
		}

	const normalizedCredits = Math.max(0, creditsValue)

	await adjustStudentCredits(studentId, normalizedPlan, normalizedCredits, syntheticClassId)
	}

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error aplicando créditos desde Excel:', err)
	await mongoose.connection.close()
	process.exit(1)
})


