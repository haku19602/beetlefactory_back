import { Schema, model, ObjectId, Error } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'
import UserRole from '../enums/UserRole.js'

// ===== 使用者購物車 Schema
const cartSchema = new Schema(
  {
    product: {
      type: ObjectId,
      ref: 'products', // mongoose 會自動關聯 products 的 model
      required: [true, '缺少商品欄位']
    },
    quantity: {
      type: Number,
      required: [true, '缺少商品數量']
    }
  }
)

// ===== 使用者收藏清單 Schema
const likesSchema = new Schema(
  {
    product: {
      type: ObjectId,
      ref: 'products',
      required: [true, '缺少商品欄位']
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
    },
    avatar: {
      type: String,
      // 預設值 default
      // default: 'aaaaaaa',
      // default 可以寫成 function，要用 this 所以不能用箭頭函式
      default () {
        // this.email 指的是同一筆資料 email 欄位的值
        return `https://source.boringavatars.com/beam/120/${this.email}?colors=899AA1,BDA2A2,FBBE9A,FAD889,FAF5C8`
        /*
        自動產生大頭貼的網站 20231228 00:16:09
        https://boringavatars.com/
        */
      }
    },
    likes: {
      type: [likesSchema]
    }
  },
  {
    // 加入時間戳，記錄更新時間
    timestamps: true,
    // 關掉 __v，關閉記錄修改次數
    versionKey: false
  }
)

// ===== 購物車內的總數量
// 寫完後， users.js 的 controllers getProfile 的 function 可以直接取得數量
// schema.virtual('欄位名') -> mongoose 的虛擬欄位，不會寫入資料庫，只會在取得資料時計算
// .get(取值時要怎麼操作)    // .set(改值時要怎麼操作)
// 20240108 影片 50:10
schema.virtual('cartQuantity').get(function () {
  // 計算購物車內的總數量
  return this.cart.reduce((total, current) => {
    return total + current.quantity
  }, 0)
})

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
