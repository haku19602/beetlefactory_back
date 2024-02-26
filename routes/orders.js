import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import admin from '../middlewares/admin.js'
import { create, get, getAll, getId } from '../controllers/orders.js'

const router = Router()

router.post('/', auth.jwt, create)
router.get('/', auth.jwt, get) // 取得訂單 -> 使用者用
router.get('/all', auth.jwt, admin, getAll) // 取得所有訂單 -> 管理者用
// ==================================== 新增的內容 ====================================
router.get('/:id', auth.jwt, getId) // 取得單一訂單明細

export default router
