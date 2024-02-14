import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { StatusCodes } from 'http-status-codes'

// ===== 設定雲端平台服務
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
})

// ===== 設定允許上傳的檔案 儲存位置、格式、大小
const upload = multer({
  // --- 存到 cloudinary
  storage: new CloudinaryStorage({ cloudinary }),
  // --- 允許的檔案格式
  fileFilter (req, file, callback) { // req: 請求物件, file: 上傳的檔案, callback: 回呼函式
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      callback(null, true) // callback(拋出 Multer 錯誤, 是否允許上傳)
    } else {
      callback(new multer.MulterError('LIMIT_FILE_FORMAT'), false) // 自訂的錯誤代碼 LIMIT_FILE_FORMAT
    }
  },
  // --- 上傳檔案大小限制
  limits: {
    fileSize: 1024 * 1024
  }
})

// ===== 處理上傳檔案的錯誤
export default (req, res, next) => {
  // 上傳設定單張
  upload.single('image')(req, res, error => { // error 代表上傳時遇到的錯誤
    if (error instanceof multer.MulterError) { // error 是哪種錯誤
      // --- 處理上傳錯誤
      let message = '上傳錯誤'
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = '檔案太大'
      } else if (error.code === 'LIMIT_FILE_FORMAT') {
        message = '檔案格式錯誤'
      }
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else if (error) {
      // --- 處理其他錯誤
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知伺服器錯誤'
      })
    } else {
      // 繼續下一步
      next()
    }
  })
}
