import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import materialsRepository from '../../repository/materialsRepository.js'

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

describe('materialsRepository — createMaterial', () => {
  it('retorna el material creado', async () => {
    // Arrange
    const newMaterial = { note_id: 3, file_name: 'slides.pdf', file_path: 'u1/3/slides.pdf' }
    const created = { id: 10, ...newMaterial }
    mockSupabase.from.mockReturnValue(mockChain({ data: created, error: null }))

    // Act
    const result = await materialsRepository.createMaterial(newMaterial)

    // Assert
    expect(result).toEqual(created)
    expect(mockSupabase.from).toHaveBeenCalledWith('material')
  })

  it('lanza error cuando falla la inserción', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Falla en insert') }))

    // Act & Assert
    await expect(materialsRepository.createMaterial({})).rejects.toThrow('Falla en insert')
  })
})

describe('materialsRepository — getMaterialById', () => {
  it('retorna el material cuando existe', async () => {
    // Arrange
    const fakeMaterial = { id: 10, note_id: 3, file_name: 'slides.pdf' }
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeMaterial, error: null }))

    // Act
    const result = await materialsRepository.getMaterialById(10)

    // Assert
    expect(result).toEqual(fakeMaterial)
  })

  it('retorna null cuando el material no existe', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: null }))

    // Act
    const result = await materialsRepository.getMaterialById(999)

    // Assert
    expect(result).toBeNull()
  })
})

describe('materialsRepository — deleteMaterial', () => {
  it('retorna true al eliminar exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))

    // Act
    const result = await materialsRepository.deleteMaterial(10)

    // Assert
    expect(result).toBe(true)
  })

  it('lanza error cuando falla la eliminación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('No se puede eliminar') }))

    // Act & Assert
    await expect(materialsRepository.deleteMaterial(10)).rejects.toThrow('No se puede eliminar')
  })
})
