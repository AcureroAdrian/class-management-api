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
const INPUT_FILE_NAME = process.env.EXCEL_INPUT_FILE ?? 'corte-al-1001-with-ids Katy.xlsx'
const INPUT_FILE = path.resolve(EXPORTS_DIR, INPUT_FILE_NAME)
const SYNTHETIC_CLASS_NAME = 'Synthetic Credit Seed Class'
const VALID_PLANS: TEnrollmentPlan[] = ['Basic', 'Optimum', 'Plus', 'Advanced']

type InputRow = {
	Apellido?: string | number
	Nombre?: string | number
	Plan?: string
	Credits?: number | string
	StudentId?: string
}

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
		const studentId = String(row.StudentId ?? '').trim()
		const planValue = String(row.Plan ?? '').trim()
		const creditsValue = parseCredits(row.Credits)

		if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
			console.warn('Saltando fila por StudentId inválido', row)
			continue
		}

		if (!VALID_PLANS.includes(planValue as TEnrollmentPlan)) {
			console.warn(`Plan inválido para ${studentId}: ${planValue}`)
			continue
		}

		if (creditsValue === null || creditsValue < 0) {
			console.warn(`Créditos inválidos para ${studentId}: ${row.Credits}`)
			continue
		}

		await adjustStudentCredits(studentId, planValue as TEnrollmentPlan, creditsValue, syntheticClassId)
	}

	await mongoose.connection.close()
}

main().catch(async (err) => {
	console.error('Error aplicando créditos desde Excel:', err)
	await mongoose.connection.close()
	process.exit(1)
})


