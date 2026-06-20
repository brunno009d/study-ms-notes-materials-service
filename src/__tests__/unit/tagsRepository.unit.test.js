import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import tagsRepository from '../../repository/tagsRepository.js'

const mockChain = (finalValue) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(finalValue).then(resolve, reject),
  }
  ;['select', 'update', 'insert', 'delete', 'eq', 'order', 'is', 'in'].forEach(
    (m) => { chain[m] = vi.fn().mockReturnValue(chain) }
  )
  chain.single      = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

describe('tagsRepository — getTagsByStudentId', () => {
  it('retorna los tags del estudiante', async () => {
    // Arrange
    const fakeTags = [{ id: 1, name: 'importante', color_hex: '#FF0000', student_id: 'u1' }]
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeTags, error: null }))

    // Act
    const result = await tagsRepository.getTagsByStudentId('u1')

    // Assert
    expect(result).toEqual(fakeTags)
    expect(mockSupabase.from).toHaveBeenCalledWith('tags')
  })

  it('retorna arreglo vacío cuando data es null', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: null }))

    // Act
    const result = await tagsRepository.getTagsByStudentId('u1')

    // Assert
    expect(result).toEqual([])
  })
})

describe('tagsRepository — createTag', () => {
  it('retorna el tag creado', async () => {
    // Arrange
    const newTag = { name: 'examen', color_hex: '#0000FF', student_id: 'u1' }
    const created = { id: 2, ...newTag }
    mockSupabase.from.mockReturnValue(mockChain({ data: created, error: null }))

    // Act
    const result = await tagsRepository.createTag(newTag)

    // Assert
    expect(result).toEqual(created)
  })

  it('lanza error cuando falla la creación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Error al crear tag') }))

    // Act & Assert
    await expect(tagsRepository.createTag({})).rejects.toThrow('Error al crear tag')
  })
})

describe('tagsRepository — updateTag', () => {
  it('retorna el tag actualizado', async () => {
    // Arrange
    const updated = { id: 1, name: 'muy importante', color_hex: '#FF0000' }
    mockSupabase.from.mockReturnValue(mockChain({ data: updated, error: null }))

    // Act
    const result = await tagsRepository.updateTag(1, { name: 'muy importante' })

    // Assert
    expect(result).toEqual(updated)
  })
})

describe('tagsRepository — deleteTag', () => {
  it('retorna true al eliminar exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))

    // Act
    const result = await tagsRepository.deleteTag(1)

    // Assert
    expect(result).toBe(true)
  })

  it('lanza error cuando falla la eliminación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('No se puede eliminar') }))

    // Act & Assert
    await expect(tagsRepository.deleteTag(1)).rejects.toThrow('No se puede eliminar')
  })
})
