import { Router } from 'express'
import { create, login, logout, extend, getProfile, avatar } from '../controllers/users.js'
import * as auth from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'

const router = Router()

router.post('/', create)
router.post('/login', auth.login, login)
router.delete('/logout', auth.jwt, logout)
router.patch('/extend', auth.jwt, extend)
router.get('/me', auth.jwt, getProfile) // 讓前端用 token 取得個人資料
router.patch('/avatar', auth.jwt, upload, avatar) // 換大頭貼
// router.patch('/cart', auth.jwt, editCart)
// router.get('/cart', auth.jwt, getCart)

export default router
