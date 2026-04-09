import { describe, it, expect, vi } from 'vitest'
import { sendError, inputValidation } from '../response'
import { z } from 'zod'

// Mock express Response
const createMockResponse = () => {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('sendError', () => {
  it('should send error message from Error instance', () => {
    const res = createMockResponse()
    const error = new Error('Test error message')
    
    sendError(res, 400, error)
    
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Test error message' })
  })

  it('should convert non-Error to string', () => {
    const res = createMockResponse()
    
    sendError(res, 500, 'String error')
    
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'String error' })
  })

  it('should handle number as error', () => {
    const res = createMockResponse()
    
    sendError(res, 404, 404)
    
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: '404' })
  })
})

describe('inputValidation', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number()
  })

  it('should return true for valid data', () => {
    const res = createMockResponse()
    const data = { name: 'John', age: 30 }
    
    const result = inputValidation(testSchema, data, res)
    
    expect(result).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should return false and send error for invalid data', () => {
    const res = createMockResponse()
    const data = { name: 'John', age: 'not a number' }
    
    const result = inputValidation(testSchema, data, res)
    
    expect(result).toBe(false)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalled()
  })

  it('should return false for missing required fields', () => {
    const res = createMockResponse()
    const data = { name: 'John' }
    
    const result = inputValidation(testSchema, data, res)
    
    expect(result).toBe(false)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
