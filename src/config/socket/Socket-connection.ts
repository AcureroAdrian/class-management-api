'use strict'

const { USER_CONNECTED_SOCKET_EVENT } = require('./events/user-socket-events')
import { AUTHORIZED_USERS } from './rooms'
/** @type {any[]} */

interface ISocketUSer {
	_id: string
	name: string
	email: string
	socketId: string
}

export const usersSocketOnline: ISocketUSer[] = []

export class SocketConnection {
	constructor(socket, io) {
		this.socket = socket
		this.io = io
		socket.on(USER_CONNECTED_SOCKET_EVENT, (user: ISocketUSer) => this.userConnected(user))
		socket.on('disconnect', () => this.userDisconnected())
	}
	userConnected(user: ISocketUSer) {
		const userId = user._id
		const socketId = this.socket.id

		this.socket.join(AUTHORIZED_USERS)

		const personConnected = usersSocketOnline?.find((person) => person._id === userId)
		if (!personConnected) {
			usersSocketOnline.push({ socketId, ...user })
		}
	}
	userDisconnected() {
		const userIndex = usersSocketOnline?.findIndex((person) => person.socketId === this.socket.id)
		if (userIndex !== -1) {
			usersSocketOnline.splice(userIndex, 1)
		}
	}
}
