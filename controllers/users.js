import users from '../models/users.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
// import products from '../models/products.js'
// import validator from 'validator'

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

// ===== 換大頭貼
export const avatar = async (req, res) => {
  try {
    /*
    console.log(req.file) -> 得到以下物件
    {
      fieldname: 'image',
      originalname: '0104.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      path: 'https://res.cloudinary.com/xxx.jpg',
      size: 46736,
      filename: 'wfsjhnj7mhucazq9rcpj'
    }
    */
    // 把大題貼改成這次檔案上傳的路徑
    req.user.avatar = req.file.path // 多檔上傳 req.files
    // 保存
    await req.user.save()
    // 回覆成功
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.avatar
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

// 20240117 -------------------------------------------------------------
// export const editCart = async (req, res) => {
//   try {
//     // 檢查商品 id 格式對不對
//     if (!validator.isMongoId(req.body.product)) throw new Error('ID')

//     // 尋找購物車內有沒有傳入的商品 ID
//     const idx = req.user.cart.findIndex((item) => item.product.toString() === req.body.product)
//     if (idx > -1) {
//       // 修改購物車內已有的商品數量
//       const quantity = req.user.cart[idx].quantity + parseInt(req.body.quantity)
//       // 檢查數量
//       // 小於 0，移除
//       // 大於 0，修改
//       if (quantity <= 0) {
//         req.user.cart.splice(idx, 1)
//       } else {
//         req.user.cart[idx].quantity = quantity
//       }
//     } else {
//       // 檢查商品是否存在或已下架
//       const product = await products.findById(req.body.product).orFail(new Error('NOT FOUND'))
//       if (!product.sell) {
//         throw new Error('NOT FOUND')
//       } else {
//         req.user.cart.push({
//           product: product._id,
//           quantity: req.body.quantity
//         })
//       }
//     }
//     await req.user.save()
//     res.status(StatusCodes.OK).json({
//       success: true,
//       message: '',
//       result: req.user.cartQuantity
//     })
//   } catch (error) {
//     if (error.name === 'CastError' || error.message === 'ID') {
//       res.status(StatusCodes.BAD_REQUEST).json({
//         success: false,
//         message: 'ID 格式錯誤'
//       })
//     } else if (error.message === 'NOT FOUND') {
//       res.status(StatusCodes.NOT_FOUND).json({
//         success: false,
//         message: '查無商品'
//       })
//     } else if (error.name === 'ValidationError') {
//       const key = Object.keys(error.errors)[0]
//       const message = error.errors[key].message
//       res.status(StatusCodes.BAD_REQUEST).json({
//         success: false,
//         message
//       })
//     } else {
//       res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: '未知錯誤'
//       })
//     }
//   }
// }

// export const getCart = async (req, res) => {
//   try {
//     const result = await users.findById(req.user._id, 'cart').populate('cart.product')
//     res.status(StatusCodes.OK).json({
//       success: true,
//       message: '',
//       result: result.cart
//     })
//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: '未知錯誤'
//     })
//   }
// }

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
