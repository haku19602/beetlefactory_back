import users from '../models/users.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import products from '../models/products.js'
import validator from 'validator'

// ===== 註冊
export const create = async (req, res) => {
  try {
    await users.create(req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      // --- models 內建資料驗證錯誤
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      // --- models 欄位資料重複錯誤
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '信箱已註冊 或 帳號名稱已被使用'
      })
    } else {
      // --- 其他伺服器錯誤
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知伺服器錯誤'
      })
    }
  }
}

// ===== 登入
export const login = async (req, res) => {
  try {
    // === 簽一個 token
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens.push(token)
    await req.user.save()
    // === 成功的 res
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      // --- 回應登入後會用到的全部資訊
      result: {
        token,
        account: req.user.account,
        email: req.user.email,
        role: req.user.role,
        // 一開始登入只要購物車內的總數量
        /*
          cart: req.user.cart.reduce((total, current) => {
            return total + current.quantity
          }, 0)
        */
        // 新寫法 -> 先在 users.js 的 models 寫一個 mongoose 的虛擬欄位
        cart: req.user.cartQuantity,
        avatar: req.user.avatar
      }
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 20240108 -------------------------------------------------------------
// ===== 登出
export const logout = async (req, res) => {
  try {
    req.tokens = req.user.tokens.filter((token) => token !== req.token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ===== token 舊換新
export const extend = async (req, res) => {
  try {
    // 找到舊 token 的索引值
    const idx = req.user.tokens.findIndex((token) => token === req.token)
    // 簽一個 token
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // === 更新 token
    req.user.tokens[idx] = token
    // === 存檔
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: token
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ===== 登入後，前端用 token 去取得個人資料
// 前端登入後，只會在 localStorage 存 token，不會存其他資料
export const getProfile = (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        account: req.user.account,
        email: req.user.email,
        role: req.user.role,
        // 購物車內的總數量
        /*
          cart: req.user.cart.reduce((total, current) => {
            return total + current.quantity
          }, 0)
        */
        // 新寫法 => 先在 users.js 的 models 寫一個 mongoose 的虛擬欄位
        cart: req.user.cartQuantity,
        avatar: req.user.avatar,
        likes: req.user.likes
      }
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 20240118 -------------------------------------------------------------
// ===== 編輯購物車商品清單
export const editCart = async (req, res) => {
  try {
    // === 檢查商品 id 格式對不對
    if (!validator.isMongoId(req.body.product)) throw new Error('ID')

    // === 尋找購物車內有沒有傳入的商品 ID
    const idx = req.user.cart.findIndex((item) => item.product.toString() === req.body.product) // req.body.product 是字串； item.product 是 mongoose 的 ObjectId，所以要 toString() 才能比較
    // === 尋找資料庫裡商品的資料
    const product = await products.findById(req.body.product).orFail(new Error('NOT FOUND'))

    // ----- 如果購物車內有此商品 ID（陣列索引值最小是 0）
    if (idx > -1) {
      // 新數量 = 購物車內數量 + 傳入的數量
      const quantity = req.user.cart[idx].quantity + parseInt(req.body.quantity)
      // 檢查目前購物車內新數量 ->
      if (quantity <= 0) {
        // 小於 0，移除商品
        req.user.cart.splice(idx, 1)
      } else if (quantity > product.stock) {
        // 新數量大於庫存，修改成庫存數量
        req.user.cart[idx].quantity = product.stock
        throw new Error('NOT ENOUGH STOCK')
      } else {
        // 新數量小於庫存，修改成新數量
        req.user.cart[idx].quantity = quantity
      }
    } else {
      // ----- 如果購物車內沒有商品，就新增商品
      // 檢查商品 id 是否存在 -> 沒有就丟出錯誤 'NOT FOUND'
      // 檢查商品是否下架 -> 沒有就丟出錯誤 'NOT FOUND'
      if (!product.sell) {
        throw new Error('NOT FOUND')
      } else if (req.body.quantity > product.stock) {
        // 商品存在架上，但是請求數量大於庫存 -> 丟出錯誤 'NOT ENOUGH STOCK'
        throw new Error('NOT ENOUGH STOCK')
      } else {
        // 商品存在架上 -> 加進購物車
        req.user.cart.push({
          product: product._id,
          quantity: req.body.quantity
        })
      }
    }
    // 存檔
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.cartQuantity // 回傳購物車內的總數量給前端，cartQuantity 是在 users.js 的 models 寫的虛擬欄位
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品 ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
      })
    } else if (error.message === 'NOT ENOUGH STOCK') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '商品庫存不足'
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

// ===== 取得購物車內的商品
export const getCart = async (req, res) => {
  try {
    // .findById(要找的資料 ID, '要顯示的欄位').populate('要帶出資料的目標欄位(此欄位須有 ref)', '要取的欄位資料(選填)')
    const result = await users.findById(req.user._id, 'cart').populate('cart.product')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: result.cart
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ==================================== 自己新增的內容 ====================================
// ===== 取全部使用者 - 管理員用
export const getAll = async (req, res) => {
  try {
    // === 取得所有使用者，設定顯示條件
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

    const data = await users
      .find({
        $or: [{ account: regex }, { email: regex }] // $ or mongoose 的語法，找 account 或 email 欄位符合 regex 的資料。直接寫文字是找完全符合的資料，這邊用正則表示式找部分符合的資料
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
    const total = await users.estimatedDocumentCount()
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

// ===== 編輯使用者
export const edit = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    // 1. 先把圖片路徑放進 req.body.image
    // 編輯時前端不一定會傳圖片，req.file 是 undefined，undefined 沒有 .path 所以要用 ?. 避免錯誤
    req.body.avatar = req.file?.path
    // 2. 再丟 req.body 更新資料，如果沒有圖片 req.file?.path 就是 undefined，不會更新圖片
    // .findByIdAndUpdate(要修改的資料 ID, 要修改的資料, { 更新時是否執行驗證: 預設 false })
    await users.findByIdAndUpdate(req.params.id, req.body, { runValidators: true }).orFail(new Error('NOT FOUND')) // orFail() 如果沒有找到資料，就自動丟出錯誤

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求使用者 ID 格式錯誤 user controller edit'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無使用者'
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

// ===== 刪除使用者
export const remove = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    await users.findByIdAndDelete(req.params.id).orFail(new Error('NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求使用者 ID 格式錯誤 remove'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無使用者'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// ===== 編輯喜歡清單
export const editLikes = async (req, res) => {
  try {
    // === 檢查商品 id 格式對不對
    if (!validator.isMongoId(req.body.product)) throw new Error('ID')

    // === 尋找喜歡使用者清單內有沒有傳入的商品 ID
    const idx = req.user.likes.findIndex((item) => item.product.toString() === req.body.product) // req.body.product 是字串； item.product 是 mongoose 的 ObjectId，所以要 toString() 才能比較
    // ----- 如果喜歡清單內有此商品 ID（陣列索引值最小是 0）
    if (idx > -1) {
      // 移除商品
      req.user.likes.splice(idx, 1)
    } else {
      // ----- 如果喜歡清單內沒有，就新增進喜歡清單
      // 檢查商品 id 是否存在 -> 沒有就丟出錯誤 'NOT FOUND'
      const product = await products.findById(req.body.product).orFail(new Error('NOT FOUND'))
      // 檢查商品是否下架 -> 沒有就丟出錯誤 'NOT FOUND'
      if (!product.sell) {
        throw new Error('NOT FOUND')
      } else {
        // 商品存在架上 -> 加進喜歡清單
        req.user.likes.push({
          product: product._id
        })
      }
    }
    // 存檔
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.likes.length // 回傳喜歡清單內的總數量給前端
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品 ID 格式錯誤'
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

// ===== 換大頭貼
// export const avatar = async (req, res) => {
//   try {
//     /*
//     console.log(req.file) -> 得到以下物件
//     {
//       fieldname: 'image',
//       originalname: '0104.jpg',
//       encoding: '7bit',
//       mimetype: 'image/jpeg',
//       path: 'https://res.cloudinary.com/xxx.jpg',
//       size: 46736,
//       filename: 'wfsjhnj7mhucazq9rcpj'
//     }
//     */
//     // 把大題貼改成這次檔案上傳的路徑
//     req.user.avatar = req.file.path // 多檔上傳 req.files
//     // 保存
//     await req.user.save()
//     // 回覆成功
//     res.status(StatusCodes.OK).json({
//       success: true,
//       message: '',
//       result: req.user.avatar
//     })
//   } catch (error) {
//     console.log(error)
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: '伺服器錯誤'
//     })
//   }
// }
