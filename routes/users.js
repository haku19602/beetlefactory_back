import { Router } from 'express'
import { create, login, logout, extend, getProfile, editCart, getCart, edit, getAll, remove } from '../controllers/users.js'
import * as auth from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'

const router = Router()

router.post('/', create)
router.post('/login', auth.login, login)
router.delete('/logout', auth.jwt, logout)
router.patch('/extend', auth.jwt, extend) // token 舊換新
router.get('/me', auth.jwt, getProfile) // 讓前端用 token 取得個人資料
router.patch('/cart', auth.jwt, editCart) // 加進購物車
router.get('/cart', auth.jwt, getCart) // 取得 users 購物車內商品
// ----------
router.get('/all', auth.jwt, admin, getAll) // 管理者用
router.patch('/:id', auth.jwt, admin, upload, edit) // 管理者用編輯全部
// router.patch('/avatar', auth.jwt, upload, avatar) // 換大頭貼?
router.delete('/:id', auth.jwt, admin, remove)

export default router
