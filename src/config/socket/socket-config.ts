'use strict'

import { Server } from 'socket.io'

// const allowedOrigins = [process.env.APP_URL, process.env.APP_PROVEEDORES_URL]

interface ServerToClientEvents {
	noArg: () => void
	basicEmit: (a: number, b: string, c: Buffer) => void
	withAck: (d: string, callback: (e: number) => void) => void
}

interface ClientToServerEvents {
	hello: () => void
}

interface InterServerEvents {
	ping: () => void
}

interface SocketData {
	name: string
	age: number
}

const socketConfig = (httpServer) => {
	const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
		cors: {
			origin: (origin, callback) => {
				// if (allowedOrigins.includes(origin) || !origin) {
				callback(null, true)
				// } else {
				// 	callback(new Error('Origin not allowed by CORS'))
				// }
			},
		},
	})

	return io
}

export default socketConfig
