import { Schema, model, ObjectId, Error } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'
import UserRole from '../enums/UserRole.js'

// ===== 使用者購物車 Schema
const cartSchema = new Schema(
  {
    product: {
      type: ObjectId,
      ref: 'products',
      required: [true, '缺少商品欄位']
    },
    quantity: {
      type: Number,
      required: [true, '缺少商品數量']
    }
  }
)

// ===== 使用者 Schema
const schema = new Schema(
  {
    account: {
      type: String,
      required: [true, '使用者帳號必填'],
      minlength: [4, '帳號名稱最少 4 字'],
      maxlength: [20, '帳號名稱最多 20 字'],
      unique: true,
      validate: {
        validator (value) {
          return validator.isAlphanumeric(value)
        },
        message: '帳號名稱只能使用英文或數字'
      }
    },
    email: {
      type: String,
      required: [true, '使用者信箱必填'],
      unique: true,
      validate: {
        validator (value) {
          return validator.isEmail(value)
        },
        message: '信箱格式錯誤'
      }
    },
    password: {
      type: String,
      required: [true, '使用者密碼必填']
    },
    tokens: {
      type: [String]
    },
    cart: {
      type: [cartSchema]
    },
    role: {
      type: Number,
      // 0 =會員，1 =管理員，缺少程式可讀性
      // 另外寫一個檔案 UserRole.js 再 import
      default: UserRole.USER
    }
  },
  {
    // 加入時間戳，記錄更新時間
    timestamps: true,
    // 關掉 __v，關閉記錄修改次數
    versionKey: false
  }
)

// ===== mongoose 的虛擬欄位
// schema.virtual('cartQuantity').get(function () {
//   return this.cart.reduce((total, current) => {
//     return total + current.quantity
//   }, 0)
// })

// ===== 密碼加密
schema.pre('save', function (next) {
  const user = this // this 代表準備要被儲存的資料
  if (user.isModified('password')) {
    // 驗證密碼長度，正確就加密 10 次
    if (user.password.length < 4 || user.password.length > 20) {
      const error = new Error.ValidationError(null)
      error.addError('password', new Error.ValidatorError({ message: '密碼最少 4 字，最多 20 字' }))
      next(error)
      return
    } else {
      user.password = bcrypt.hashSync(user.password, 10)
    }
  }
  next()
})

export default model('users', schema)
