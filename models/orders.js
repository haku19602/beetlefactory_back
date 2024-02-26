import { Schema, model, ObjectId } from 'mongoose'

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

// ===== 訂單 Schema
const schema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: 'users',
      required: [true, '缺少使用者']
    },
    cart: {
      type: [cartSchema],
      validate: {
        validator (value) {
          return Array.isArray(value) && value.length > 0 // 判斷參數 value 是否為陣列且長度大於 0
        },
        message: '購物車不能為空'
      }
    },
    delivery: {
      type: String,
      required: [true, '缺少運送方式'],
      enum: {
        values: ['黑貓', '7-11 交貨便', '面交'],
        message: '非指定運送方式'
      }
    },
    address: {
      type: String,
      required: [true, '缺少收件地址']
    },
    name: {
      type: String,
      required: [true, '缺少收件人姓名']
    },
    phone: {
      type: String,
      required: [true, '缺少收件人電話']
    },
    // 備註
    note: {
      type: String,
      default: ''
    },
    // 是否已付款
    paid: {
      type: Boolean,
      default: false,
      required: [true, '缺少付款狀態']
    },
    // 是否完成交易
    done: {
      type: Boolean,
      default: false,
      required: [true, '缺少完成訂單狀態']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default model('orders', schema)

/*
訂單跟使用者是組合關係，也可以放在 users 的 model
但是為了方便管理，我們將訂單獨立出來，否則管理員取所有使用者訂單的排序、查詢會變得很複雜
視情況把一些東西獨立出來，可以讓程式更好維護
  寫在使用者 model 的話 -> 抓全部訂單時要先抓所有使用者的訂單欄位，再排序
                      -> user.find({}, 'order').sort({order.date: -1})
*/
