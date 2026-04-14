import { Request, Response, NextFunction } from "express"
import logger from "../logger.js"

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`)
  res.status(500).json({ error: err.message })
}
