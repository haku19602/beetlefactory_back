import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import routeUsers from './routes/users.js'
import routeProducts from './routes/products.js'
// import routeOrders from './routes/orders.js'
import { StatusCodes } from 'http-status-codes'
// import mongoSanitize from 'express-mongo-sanitize'
import './passport/passport.js'

// ===== 建立網頁伺服器
const app = express()

// 防止攻擊資料庫 方式2 載套件 express-mongo-sanitiz，
// app.use(mongoSanitize())

// ===== 跨域請求設定
app.use(
  cors({
    /*
      origin                       -> 請求的來源，用 postman 會是 undefined
      callback(拋出錯誤, 是否允許請求) -> callback 相當於 return 的作用
    */
    origin (origin, callback) {
      // --- 允許的請求：postman、前端上 github、前端本機測試
      if (origin === undefined || origin.includes('github.io') || origin.includes('localhost')) {
        callback(null, true)
      } else {
        callback(new Error('CORS'), false)
      }
    }
  })
)
// --- 處理跨域請求錯誤
app.use((_, req, res, next) => {
  res.status(StatusCodes.FORBIDDEN).json({
    success: false,
    message: '請求遭拒絕'
  })
})

// ===== 將傳入 express 伺服器請求的 body 解析為 json 格式
app.use(express.json())
// --- 處理轉 json 的錯誤
app.use((_, req, res, next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: '資料格式錯誤'
  })
})

// ===== 路徑
app.use('/users', routeUsers)
app.use('/products', routeProducts)
// app.use('/orders', routeOrders)

// ===== 其他沒寫的路徑
/*
  app.all -> 所有請求方式
  '*'     -> 所有路徑
  */
app.all('*', (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '找不到頁面'
  })
})

// ===== 綁定 port
app.listen(process.env.PORT || 4000, async () => {
  console.log('伺服器啟動')
  await mongoose.connect(process.env.DB_URL)

  // 方式1 mongoDB 內建，防止攻擊資料庫
  // mongoose.set('sanitizeFilter', true)
  // 方式2 載套件 express-mongo-sanitiz，(寫在上面)

  console.log('資料庫連線成功')
})
