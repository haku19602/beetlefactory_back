import passport from 'passport'
import { StatusCodes } from 'http-status-codes'
// import jsonwebtoken from 'jsonwebtoken'

// ===== 處理登入請求
export const login = (req, res, next) => {
  // === 呼叫自訂驗證方式 'login'，寫驗證方式做完後要做什麼
  passport.authenticate('login', { session: false }, (error, user, info) => {
    // --- 有錯誤
    if (!user || error) {
      if (info.message === 'Missing credentials') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '缺少帳號或密碼欄位'
        })
        return
      } else if (info.message === '未知錯誤') {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '未知錯誤'
        })
        return
      } else {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: info.message
        })
        return
      }
    }
    // --- 沒錯誤
    req.user = user // 將查詢到的使用者放入 req 中給後面的 controller 或 middleware 使用
    next()
  })(req, res, next)
}

// 20240108 -------------------------------------------------------------
// ===== 處理 jwt 請求，使用自訂驗證 jwt
// export const jwt = (req, res, next) => {
//   passport.authenticate('jwt', { session: false }, (error, data, info) => {
//     if (error || !data) {
//       if (info instanceof jsonwebtoken.JsonWebTokenError) {
//         // JWT 格式不對、SECRET 不對
//         res.status(StatusCodes.UNAUTHORIZED).json({
//           success: false,
//           message: 'JWT 無效'
//         })
//       } else if (info.message === '未知錯誤') {
//         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//           success: false,
//           message: '未知錯誤'
//         })
//       } else {
//         // 其他錯誤
//         res.status(StatusCodes.UNAUTHORIZED).json({
//           success: false,
//           message: info.message
//         })
//       }
//       return
//     }
//     req.user = data.user
//     req.token = data.token
//     next()
//   })(req, res, next)
// }
