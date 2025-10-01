'use strict'

import 'colors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import connectDB from './config/db/db'
import { StudentAttendance } from './models/StudentAttendance'

dotenv.config()

const markStudentAsAbsent = async () => {
	try {
		// ID del estudiante específico (hardcoded como se solicitó)
		const studentId = '68d9703592ab5db390cbf405'

		// Validar que el ID sea un ObjectId válido
		if (!mongoose.Types.ObjectId.isValid(studentId)) {
			console.log('❌ ID de estudiante inválido'.red)
			process.exit(1)
		}

		const objectId = new mongoose.Types.ObjectId(studentId)

		// Conectar a la base de datos
		await connectDB()
		console.log('🔗 Conectado a la base de datos'.green)

		// Buscar todos los documentos que contengan al estudiante
		const documentsWithStudent = await StudentAttendance.find({
			status: 'active',
			'attendance.student': objectId,
		})

		console.log(`📊 Encontrados ${documentsWithStudent.length} registros de asistencia que contienen al estudiante`.blue)

		if (documentsWithStudent.length === 0) {
			console.log('⚠️  No se encontraron registros de asistencia para este estudiante'.yellow)
			process.exit(0)
		}

		// Mostrar información de los registros encontrados
		console.log('📋 Detalle de registros encontrados:'.cyan)
		documentsWithStudent.forEach((doc, index) => {
			const studentAttendance = doc.attendance.find(a => a.student.toString() === studentId)
			const status = studentAttendance?.attendanceStatus || 'unknown'
			const date = `${doc.date.year}-${doc.date.month}-${doc.date.day} ${doc.date.hour}:${doc.date.minute}`
			console.log(`   ${index + 1}. Fecha: ${date} - Estado actual: ${status}`)
		})

		// Actualizar todos los registros para marcar al estudiante como ausente
		const updateResult = await StudentAttendance.updateMany(
			{ status: 'active', 'attendance.student': objectId },
			{
				$set: {
					'attendance.$[elem].attendanceStatus': 'present',
					'attendance.$[elem].isOverflowAbsence': false,
				},
			},
			{
				arrayFilters: [{ 'elem.student': objectId }],
			} as any,
		)

		console.log(`\n✅ Actualización completada:`.green.bold)
		console.log(`   📝 Registros objetivo: ${documentsWithStudent.length}`.green)
		console.log(`   🔄 Registros modificados: ${(updateResult as any).modifiedCount}`.green)
		console.log(`   📊 Estado actualizado a: 'absent'`.green)

		// Verificar algunos registros actualizados para confirmar
		const verificationDocs = await StudentAttendance.find({
			status: 'active',
			'attendance.student': objectId,
		}).limit(3)

		if (verificationDocs.length > 0) {
			console.log('\n🔍 Verificación de registros actualizados:'.cyan)
			verificationDocs.forEach((doc, index) => {
				const studentAttendance = doc.attendance.find(a => a.student.toString() === studentId)
				const status = studentAttendance?.attendanceStatus || 'unknown'
				const date = `${doc.date.year}-${doc.date.month}-${doc.date.day} ${doc.date.hour}:${doc.date.minute}`
				console.log(`   ${index + 1}. Fecha: ${date} - Nuevo estado: ${status}`)
			})
		}

	} catch (error) {
		console.error('❌ Error durante la ejecución:'.red, error)
		process.exit(1)
	} finally {
		// Cerrar la conexión a la base de datos
		await mongoose.connection.close()
		console.log('🔌 Conexión a la base de datos cerrada'.yellow)
		process.exit(0)
	}
}

// Ejecutar el script
console.log('🚀 Iniciando script de actualización sintética...'.blue.bold)
console.log('🎯 Estudiante ID: 68bb587be91aa6a33eabb2db'.blue)
markStudentAsAbsent()
