import { expect, it } from 'vitest'
import * as members from './members'
import * as schemas from './schemas'

it('debug', () => {
  console.log('OfferSchema:', typeof schemas.OfferSchema, 'NeedSchema:', typeof schemas.NeedSchema)
  const shape = (members.DirectoryMemberSchema as unknown as { shape: Record<string, { _def: { innerType?: { _def?: { type?: unknown } } } }> }).shape
  console.log('offers inner:', typeof shape.offers._def.innerType)
  console.log('needs inner:', typeof shape.needs._def.innerType)
  console.log('offers array type:', typeof shape.offers._def.innerType?._def?.type)
  console.log('needs array type:', typeof shape.needs._def.innerType?._def?.type)
  expect(true).toBe(true)
})
