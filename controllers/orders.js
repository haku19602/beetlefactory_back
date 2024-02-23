import orders from '../models/orders.js'
import users from '../models/users.js'
import { StatusCodes } from 'http-status-codes'

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
      user: req.user._id,
      cart: req.user.cart,
      // ----- 以下為新增的欄位 -----
      delivery: req.body.delivery,
      address: req.body.address,
      name: req.body.name,
      phone: req.body.phone
    })

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
    } else if (error.name === 'SELL') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '購物車商品已下架 或 庫存不足'
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

// ===== 取得訂單 - 管理員
export const getAll = async (req, res) => {
  try {
    // populate('要帶出資料的目標欄位(此欄位須有 ref)', '要取的欄位資料(選填)') -> 這裡只取訂單中 user 的 account 欄位，及訂單中 cart.product 欄位關聯的全部資料
    const result = await orders.find().populate('user', 'account').populate('cart.product')
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
