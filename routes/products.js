import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import { create, getAll, edit, remove, get, getId } from '../controllers/products.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'

const router = Router()

router.post('/', auth.jwt, admin, upload, create)
router.get('/all', auth.jwt, admin, getAll) // 取得所有商品頁面 -> 管理者用
router.patch('/:id', auth.jwt, admin, upload, edit) // 編輯商品 -> 管理者用
router.get('/', get) // 取得上架商品頁面 -> 一般使用者用
router.get('/:id', getId) // 取得單一商品頁面
// ----------
router.delete('/:id', auth.jwt, admin, remove)

export default router
