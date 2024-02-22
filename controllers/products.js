import products from '../models/products.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'

// ===== 新增商品
export const create = async (req, res) => {
  try {
    req.body.image = req.file.path // 圖片路徑
    const result = await products.create(req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
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

// ===== 取所有商品 -> 管理者用
export const getAll = async (req, res) => {
  try {
    // === 取得所有商品，設定顯示條件
    /*
      --- req 的參數，可以取得當前的路由資訊
        ->  req.originalUrl = /users/test?aaa=111&bbb=2
            req.query = { aaa: 111, bbb: 222 }
    */
    const sortBy = req.query.sortBy || 'createdAt' // 依照什麼排序，預設是建立時間
    const sortOrder = parseInt(req.query.sortOrder) || -1 // 正序or倒序，預設倒序（時間的話是新到舊
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20 // 一頁幾筆，預設 20 筆
    const page = parseInt(req.query.page) || 1 // 現在是第幾頁，預設第 1 頁
    const regex = new RegExp(req.query.search || '', 'i') // 關鍵字搜尋，沒傳值就是空字串，i 是設定不分大小寫

    const data = await products
      .find({
        $or: [{ name: regex }, { description: regex }] // $ or mongoose 的語法，找 name 或 description 欄位符合 regex 的資料。直接寫文字是找完全符合的資料，這邊用正則表示式找部分符合的資料
      })
      /*
        // [sortBy] 把變數當成 key 來用，不是陣列
        -> 舉例
          const text = 'a'
          const obj = { [text]: 1 }
          obj.a = 1
      */
      .sort({ [sortBy]: sortOrder })
      // 如果一頁 10 筆
      // 第 1 頁 = 0 ~ 10 = 跳過 0 筆 = (1 - 1) * 10
      // 第 2 頁 = 11 ~ 20 = 跳過 10 筆 = (2 - 1) * 10
      // 第 3 頁 = 21 ~ 30 = 跳過 20 筆 = (3 - 1) * 10
      .skip((page - 1) * itemsPerPage)
      // 前端有顯示全部選項，如果是 -1 就用 undefined 限制，會顯示全部
      .limit(itemsPerPage === -1 ? undefined : itemsPerPage)

    // === estimatedDocumentCount() 計算總資料數
    const total = await products.estimatedDocumentCount()
    // === 回傳成功結果
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

// ===== 取得上架的所有商品 -> 一般使用者用
export const get = async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = parseInt(req.query.sortOrder) || -1
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20
    const page = parseInt(req.query.page) || 1
    const regex = new RegExp(req.query.search || '', 'i')

    const data = await products
      .find({
        sell: true, // 只顯示上架商品
        // stock: { $gt: 0 }, // 只顯示有庫存商品
        $or: [{ name: regex }, { description: regex }]
      })
      // const text = 'a'
      // const obj = { [text]: 1 }
      // obj.a = 1
      .sort({ [sortBy]: sortOrder })
      // 如果一頁 10 筆
      // 第 1 頁 = 0 ~ 10 = 跳過 0 筆 = (1 - 1) * 10
      // 第 2 頁 = 11 ~ 20 = 跳過 10 筆 = (2 - 1) * 10
      // 第 3 頁 = 21 ~ 30 = 跳過 20 筆 = (3 - 1) * 10
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage === -1 ? undefined : itemsPerPage)

    // estimatedDocumentCount() 計算總資料數        -> 沒有篩選
    // countDocuments() 依照 () 內篩選計算總資料數    -> 要篩選
    const total = await products.countDocuments({ sell: true })
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

// ===== 取得單一商品
export const getId = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const result = await products.findById(req.params.id)

    if (!result) throw new Error('NOT FOUND')

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') { // 'CastError' 是 mongoose 的錯誤，代表 ID 格式錯誤
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求商品 ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// ===== 編輯商品 - 後台
export const edit = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    // 1. 先把圖片路徑放進 req.body.image
    // 編輯時前端不一定會傳圖片，req.file 是 undefined，undefined 沒有 .path 所以要用 ?. 避免錯誤
    req.body.image = req.file?.path
    // 2. 再丟 req.body 更新資料，如果沒有圖片 req.file?.path 就是 undefined，不會更新圖片
    // .findByIdAndUpdate(要修改的資料 ID, 要修改的資料, { 更新時是否執行驗證: 預設 false })
    await products.findByIdAndUpdate(req.params.id, req.body, { runValidators: true }).orFail(new Error('NOT FOUND')) // orFail() 如果沒有找到資料，就自動丟出錯誤

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求商品 ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
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

// ==================================== 自己新增的內容 ====================================
// ===== 刪除商品 - 後台
export const remove = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    await products.findByIdAndDelete(req.params.id).orFail(new Error('NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求商品 ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}
