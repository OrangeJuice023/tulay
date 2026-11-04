import { describe, expect, it } from 'vitest'
import { safeNextPath } from './redirects'

describe('safeNextPath', () => {
  it('passes ordinary in-app paths through', () => {
    expect(safeNextPath('/home')).toBe('/home')
    expect(safeNextPath('/introductions')).toBe('/introductions')
    expect(safeNextPath('/ask?q=mentor')).toBe('/ask?q=mentor')
  })

  it('falls back to /home for missing or blank values', () => {
    expect(safeNextPath(null)).toBe('/home')
    expect(safeNextPath(undefined)).toBe('/home')
    expect(safeNextPath('')).toBe('/home')
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeNextPath('https://evil.example/phish')).toBe('/home')
    expect(safeNextPath('//evil.example/phish')).toBe('/home')
    expect(safeNextPath('javascript:alert(1)')).toBe('/home')
  })

  it('rejects backslashes, spaces, and angle brackets', () => {
    expect(safeNextPath('/\\/evil.example')).toBe('/home')
    expect(safeNextPath('/home page')).toBe('/home')
    expect(safeNextPath('/home?<script>')).toBe('/home')
  })
})
