import orders from '../models/orders.js'
import users from '../models/users.js'
import products from '../models/products.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
// import mongoose from 'mongoose'

// ===== 新增訂單
export const create = async (req, res) => {
  try {
    // === 檢查購物車有沒有東西
    if (req.user.cart.length === 0) throw new Error('EMPTY')

    // === 檢查有沒有下架商品
    // 查使用者購物車及關聯商品資訊
    const result = await users.findById(req.user._id, 'cart').populate('cart.product')
    // 檢查是否每個商品都是上架商品，且庫存大於 0
    const ok = result.cart.every((item) => item.product.sell && item.product.stock > 0) // .every() 陣列全部執行 function 都 return true 才回傳 true
    if (!ok) throw new Error('SELL')

    // === 建立訂單
    await orders.create({
      // --- 直接以 req.user 取得資料庫中 user 的資料
      user: req.user._id,
      cart: req.user.cart,
      // --- 從請求中傳進來資料
      delivery: req.body.delivery,
      address: req.body.address,
      name: req.body.name,
      phone: req.body.phone,
      note: req.body.note
    })

    // === 扣除商品庫存
    // 逐一處理每個商品
    for (const item of req.user.cart) {
      // 找到商品
      const product = await products.findById(item.product)
      // 扣除庫存
      product.stock -= item.quantity
      // 存檔
      await product.save()
    }

    // === 清空購物車
    req.user.cart = []
    // === 存檔(資料庫購物車清空)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'EMPTY') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '購物車沒有商品'
      })
    } else if (error.message === 'SELL') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '購物車商品庫存更新！3 秒後自動重整...'
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// ===== 取得訂單 - 使用者
export const get = async (req, res) => {
  try {
    // .find(訂單中 user 是請求的 user 的資料).populate('要帶出資料的目標欄位(此欄位須有 ref)', '要取的欄位資料(選填)')
    const result = await orders.find({ user: req.user._id }).populate('cart.product')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ===== 取得全部訂單 - 管理員
// export const getAll = async (req, res) => {
//   try {
//     const result = await orders.find().populate('user', 'account').populate('cart.product')
//     res.status(StatusCodes.OK).json({
//       success: true,
//       message: '',
//       result
//     })
//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: '未知錯誤'
//     })
//   }
// }

export const getAll = async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'createdAt' // 依照什麼排序，預設是建立時間
    const sortOrder = parseInt(req.query.sortOrder) || -1 // 正序or倒序，預設倒序（時間的話是新到舊
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20 // 一頁幾筆，預設 20 筆
    const page = parseInt(req.query.page) || 1 // 現在是第幾頁，預設第 1 頁
    // const searchKeyword = new mongoose.Types.ObjectId(req.query.search) || '' // 關鍵字搜尋，沒傳值就是空字串

    const data = await orders
      .find(
        // { _id: searchKeyword } // $ or mongoose 的語法，找 _id 欄位符合 searchKeyword 的資料
      )
      .sort({ [sortBy]: sortOrder }) // [sortBy] 是把變數當成 key 來用，不是陣列
      .skip((page - 1) * itemsPerPage) // 跳過幾筆
      .limit(itemsPerPage === -1 ? undefined : itemsPerPage) // 限制幾筆
      .populate('user', 'account avatar') // populate('要帶出資料的目標欄位，此欄位須有 ref', '要取的欄位資料(選填)') -> 這裡只取訂單中 user 的 account 欄位和 avatar 欄位
      .populate('cart.product')

    // === estimatedDocumentCount() 計算總資料數
    const total = await products.estimatedDocumentCount()

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        data,
        total
      }
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ==================================== 新增的內容 ====================================
// ===== 取得訂單 - 單筆
export const getId = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const result = await orders.findById(req.params.id).populate('user', 'account avatar').populate('cart.product')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求訂單 ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無訂單'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}
