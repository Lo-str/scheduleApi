import { describe, it, expect } from 'vitest'
import { loginSchema } from '../loginSchema'

describe('loginSchema', () => {
  it('should accept valid login with username and password', () => {
    const data = { username: 'testuser', password: 'secret123' }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should accept valid login with email and password', () => {
    const data = { email: 'test@example.com', password: 'secret123' }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should accept login with both email and username', () => {
    const data = { email: 'test@example.com', username: 'testuser', password: 'secret123' }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should reject login without email or username', () => {
    const data = { password: 'secret123' }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject login without password', () => {
    const data = { username: 'testuser' }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject empty object', () => {
    const data = {}
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
