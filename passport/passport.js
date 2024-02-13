import passport from 'passport'
import passportLocal from 'passport-local'
// import passportJWT from 'passport-jwt'
import bcrypt from 'bcrypt'
import users from '../models/users.js'

// ===== 登入驗證
passport.use('login', new passportLocal.Strategy(
  // === 策略的設定
  {
    usernameField: 'account',
    passwordField: 'password'
  },
  // === 檢查有沒有以上 email、password 欄位 -> 有，執行 async function；沒有，會有錯誤'Missing credentials'
  async (account, password, done) => {
    try {
      const user = await users.findOne({ account })
      // 檢查帳號存在
      if (!user) {
        throw new Error('ACCOUNT')
      }
      // 檢查密碼正確
      if (!bcrypt.compareSync(password, user.password)) {
        throw new Error('PASSWORD')
      }
      // 都正確 -> done(錯誤, 資料, info)
      return done(null, user, null)
    } catch (error) {
      // === return 錯誤回覆 done()
      if (error.message === 'ACCOUNT') {
        return done(null, null, { message: '帳號不存在' })
      } else if (error.message === 'PASSWORD') {
        return done(null, null, { message: '密碼錯誤' })
      } else {
        return done(null, null, { message: '未知錯誤' })
      }
    }
  }
))

// 20240108 ----------------------------------------------------------------------
// ===== jwt 序號驗證
// passport.use('jwt', new passportJWT.Strategy(
//   {
//     jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
//     secretOrKey: process.env.JWT_SECRET,
//     passReqToCallback: true,
//     // 略過過期檢查
//     ignoreExpiration: true
//   },
//   async (req, payload, done) => {
//     try {
//       // 檢查過期
//       // jwt 過期時間單位是秒，node.js 日期單位是毫秒 => *1000
//       const expired = payload.exp * 1000 < new Date().getTime()

//       /*
//       http://localhost:4000/users/test?aaa=111&bbb=2
//       req.originalUrl = /users/test?aaa=111&bbb=2
//       req.baseUrl = /users
//       req.path = /test
//       req.query = { aaa: 111, bbb: 222 }
//       */
//       const url = req.baseUrl + req.path
//       if (expired && url !== '/users/extend' && url !== '/users/logout') {
//         throw new Error('EXPIRED')
//       }

//       // === 取得 token
//       // const token = req.headers.authorization.split(' ')
//       const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)
//       const user = await users.findOne({ _id: payload._id, tokens: token })
//       if (!user) {
//         throw new Error('JWT')
//       }

//       return done(null, { user, token }, null)
//     } catch (error) {
//       if (error.message === 'EXPIRED') {
//         return done(null, null, { message: 'JWT 過期' })
//       } else if (error.message === 'JWT') {
//         return done(null, null, { message: 'JWT 無效' })
//       } else {
//         return done(null, null, { message: '未知錯誤' })
//       }
//     }
//   }
// ))
