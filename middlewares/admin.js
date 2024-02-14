import UserRole from '../enums/UserRole.js'
import { StatusCodes } from 'http-status-codes'

export default (req, res, next) => {
  if (req.user.role !== UserRole.ADMIN) {
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: '沒有管理員權限'
    })
  } else {
    next()
  }
}
