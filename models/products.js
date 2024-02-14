import { Schema, model } from 'mongoose'

const schema = new Schema(
  {
    name: {
      type: String,
      required: [true, '缺少商品名稱']
    },
    price: {
      type: Number,
      required: [true, '缺少商品價格']
    },
    image: {
      type: String,
      required: [true, '缺少商品圖片']
    },
    description: {
      type: String,
      required: [true, '缺少商品說明']
    },
    category: {
      type: String,
      required: [true, '缺少商品分類'],
      enum: {
        values: ['成蟲', '幼蟲', '標本'],
        message: '商品分類錯誤'
      }
    },
    sell: {
      type: Boolean,
      required: [true, '缺少商品上架狀態']
    },
    stock: {
      type: Number,
      required: [true, '商品庫存數量必填']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default model('products', schema)
