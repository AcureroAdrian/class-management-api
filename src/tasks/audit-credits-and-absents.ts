'use strict'

import dotenv from 'dotenv'
dotenv.config()

import path from 'path'
import fs from 'fs/promises'
import jwt from 'jsonwebtoken'

type JsonRecord = Record<string, any>

function requiredEnv(name: string): string {
	const v = process.env[name]
	if (!v || !v.trim()) {
		throw new Error(`Missing required env var: ${name}`)
	}
	return v.trim()
}

function optionalEnv(name: string, fallback: string): string {
	const v = process.env[name]
	return v && v.trim() ? v.trim() : fallback
}

function asNonEmptyList(value: string): string[] {
	return (value || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

async function readJson(res: Response): Promise<JsonRecord> {
	const text = await res.text()
	try {
		return text ? (JSON.parse(text) as JsonRecord) : {}
	} catch {
		return { raw: text }
	}
}

async function postJson(url: string, body: any, headers: Record<string, string>): Promise<JsonRecord> {
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		body: JSON.stringify(body),
	})
	const data = await readJson(res)
	if (!res.ok) {
		throw new Error(`POST ${url} failed: ${res.status} ${res.statusText} :: ${JSON.stringify(data)}`)
	}
	return data
}

async function getJson(url: string, headers: Record<string, string>): Promise<JsonRecord> {
	const res = await fetch(url, {
		method: 'GET',
		headers,
	})
	const data = await readJson(res)
	if (!res.ok) {
		throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} :: ${JSON.stringify(data)}`)
	}
	return data
}

async function main() {
	// Inputs
	const baseUrl = optionalEnv('AUDIT_API_BASE_URL', 'http://localhost:8000').replace(/\/+$/, '')
	const apiKey = requiredEnv('AUDIT_API_KEY')
	const userIds = asNonEmptyList(requiredEnv('AUDIT_USER_IDS'))
	const tag = optionalEnv('AUDIT_TAG', 'snapshot')
	const outputDir = optionalEnv('AUDIT_OUTPUT_DIR', path.resolve(process.cwd(), 'audit-output'))

	await fs.mkdir(outputDir, { recursive: true })

	const commonHeaders = {
		'x-api-key': apiKey,
	}

	console.log(`Audit starting. baseUrl=${baseUrl}, users=${userIds.length}, out=${outputDir}`)

	for (const userId of userIds) {
		// 1) Login -> token
		const login = await postJson(`${baseUrl}/api/auth/login`, { userId }, commonHeaders)
		const token = String(login?.token || '')
		if (!token) {
			throw new Error(`Login did not return token for userId=${userId}`)
		}

		// 2) Decode token to get Mongo _id
		const decoded: any = jwt.decode(token)
		const studentId = String(decoded?._id || '')
		if (!studentId) {
			throw new Error(`Could not decode _id from token for userId=${userId}`)
		}

		const authHeaders = {
			...commonHeaders,
			Authorization: `Bearer ${token}`,
		}

		// 3) Fetch endpoints to snapshot
		const credits = await getJson(`${baseUrl}/api/users/${studentId}/credits`, authHeaders)
		const classes = await getJson(`${baseUrl}/api/karate-classes/student`, authHeaders)

		const payload = {
			userId,
			studentId,
			timestamp: new Date().toISOString(),
			credits,
			karateClassesStudent: classes,
		}

		const outFile = path.resolve(outputDir, `${tag}-${userId}.json`)
		await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8')

		const totalCredits = credits?.totalCredits ?? credits?.poolCredits ?? null
		const absentsCount = Array.isArray(classes?.absents) ? classes.absents.length : null

		console.log(`OK userId=${userId} studentId=${studentId} totalCredits=${totalCredits} absents=${absentsCount}`)
	}

	console.log('Audit completed.')
}

main().catch((err) => {
	console.error('Audit failed:', err)
	process.exit(1)
})

