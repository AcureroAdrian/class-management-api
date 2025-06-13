import 'colors'
import dotenv from 'dotenv'
import cors from 'cors'
import http from 'http'
import path from 'path'
import morgan from 'morgan'
import express from 'express'
import router from '../../routes'
import socketConfig from '../socket/socket-config'
import { SocketConnection } from '../socket/Socket-connection'
import errorMiddleware from '../../middleware/error-middleware'
import notFound from '../../middleware/not-found-middleware'
import { startScheduledDeletionCron } from '../../utils/scheduled-deletion-cron'

dotenv.config()

const app = express()
const server = http.createServer(app)
 
const io = socketConfig(server)

io.on('connection', (socket) => {
	new SocketConnection(socket, io)
})

// Inicializar cron job para eliminaciones programadas
startScheduledDeletionCron()

app.set('io', io)
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'))
}

app.use('/api', router)
app.use('/public', express.static(path.join(__dirname, 'public')))

// Server Middlewares
app.use(notFound)
app.use(errorMiddleware)

export default server