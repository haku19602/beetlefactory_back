import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import { create, getAll, edit, remove } from '../controllers/products.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'

const router = Router()

router.post('/', auth.jwt, admin, upload, create)
router.get('/all', auth.jwt, admin, getAll)
router.patch('/:id', auth.jwt, admin, upload, edit)
// router.get('/', get)
// router.get('/:id', getId)
router.delete('/:id', auth.jwt, admin, remove)

export default router
