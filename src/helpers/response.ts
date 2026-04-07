  //****************************************//
 //                IMPORTS                 //
//****************************************//

import express from "express"
import { ZodType } from "zod"

  //****************************************//
 //                HELPERS                 //
//****************************************//

// Handle errors status
export const sendError = (res: express.Response, stat: number, error: unknown): void => {
    const msg = error instanceof Error ? error.message: String(error)
    res.status(stat).json({error: msg})
}

// Handle input validation
const inputValidation = (schema: ZodType, data: unknown, res: express.Response): boolean => {
    const result = schema.safeParse(data)
    if (!result.success) {
        sendError(res, 400, result.error.message)
        return false
    }
    return true
}