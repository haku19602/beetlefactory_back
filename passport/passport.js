import passport from 'passport'
import passportLocal from 'passport-local'
import passportJWT from 'passport-jwt'
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

// 20240108 -------------------------------------------------------------
// ===== jwt 序號驗證
passport.use('jwt', new passportJWT.Strategy(
  // === 策略的設定
  {
    // 從 header 取得 token
    jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
    // 驗證 token 密碼是否正確
    secretOrKey: process.env.JWT_SECRET,
    // 讓後面的 function 能取得請求 req，因為套件不會主動提供擷取的 JWT
    passReqToCallback: true,
    // 略過過期檢查，下面定義自行檢查舊換新
    ignoreExpiration: true
  },
  /*
    payload 是解譯後的 jwt 內容，我們這裡存的是使用者 id -> 寫在 users.js 的 controllers 登入時簽的
    done 是 function
  */
  async (req, payload, done) => {
    try {
      // === 檢查過期 -> 丟出錯誤到 catch (error) 處理
      const expired = payload.exp * 1000 < new Date().getTime() // jwt 過期時間 payload.exp 單位是秒，node.js 日期單位是毫秒 => *1000

      /*
        --- req 的參數，可以取得當前的路由資訊
        http://localhost:4000/users/test?aaa=111&bbb=2
        ->
        req.originalUrl = /users/test?aaa=111&bbb=2
        req.baseUrl = /users
        req.path = /test
        req.query = { aaa: 111, bbb: 222 }
      */
      const url = req.baseUrl + req.path
      // 如果過期，且不是 token 舊換新路徑，且不是登出路徑，就拋出錯誤
      // 也就是說，只允許舊換新或登出路徑，可以有過期 token
      if (expired && url !== '/users/extend' && url !== '/users/logout') {
        throw new Error('EXPIRED')
      }

      // === 從 header 取得 token
      // const token = req.headers.authorization.split(' ')  // 1
      const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)

      const user = await users.findOne({ _id: payload._id, tokens: token })
      if (!user) {
        throw new Error('JWT')
      }

      // === 驗證成功 -> done(錯誤, 資料, info)
      return done(null, { user, token }, null)
    } catch (error) {
      if (error.message === 'EXPIRED') {
        return done(null, null, { message: 'JWT 過期' })
      } else if (error.message === 'JWT') {
        return done(null, null, { message: 'JWT 無效' })
      } else {
        return done(null, null, { message: '未知錯誤' })
      }
    }
  }
))
