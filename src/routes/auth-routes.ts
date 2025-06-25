import { Router } from 'express'
import { loginUser } from '../controllers/auth'

const router = Router()

router.route('/login').post(loginUser)

export default router
