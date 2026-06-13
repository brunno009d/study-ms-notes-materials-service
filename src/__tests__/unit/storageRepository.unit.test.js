import { describe, it, expect, vi, beforeEach } from 'vitest'

// storageRepository usa supabase.storage.from(), no supabase.from()
const { mockSupabase, mockStorageBucket } = vi.hoisted(() => {
  const mockStorageBucket = {
    upload:           vi.fn(),
    remove:           vi.fn(),
    createSignedUrl:  vi.fn(),
  }
  return {
    mockStorageBucket,
    mockSupabase: {
      storage: {
        from: vi.fn(() => mockStorageBucket),
      },
    },
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import storageRepository from '../../repository/storageRepository.js'

beforeEach(() => vi.clearAllMocks())

// ─── uploadFile ────────────────────────────────────────────────────────────

describe('storageRepository — uploadFile', () => {
  it('retorna los datos del archivo subido', async () => {
    // Arrange
    const fakeData = { path: 'u1/note3/slides.pdf', id: 'file-uuid' }
    mockStorageBucket.upload.mockResolvedValue({ data: fakeData, error: null })

    // Act
    const result = await storageRepository.uploadFile(
      'u1/note3/slides.pdf',
      Buffer.from('contenido'),
      'application/pdf'
    )

    // Assert
    expect(result).toEqual(fakeData)
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('academic-resources')
    expect(mockStorageBucket.upload).toHaveBeenCalledWith(
      'u1/note3/slides.pdf',
      expect.any(Buffer),
      { contentType: 'application/pdf', upsert: false }
    )
  })

  it('lanza error cuando falla la subida', async () => {
    // Arrange
    mockStorageBucket.upload.mockResolvedValue({ data: null, error: new Error('Bucket lleno') })

    // Act & Assert
    await expect(
      storageRepository.uploadFile('path', Buffer.from('x'), 'image/png')
    ).rejects.toThrow('Bucket lleno')
  })
})

// ─── deleteFiles ───────────────────────────────────────────────────────────

describe('storageRepository — deleteFiles', () => {
  it('retorna undefined sin consultar storage cuando no hay paths', async () => {
    // Arrange — short circuit cuando el arreglo está vacío

    // Act
    const result = await storageRepository.deleteFiles([])

    // Assert
    expect(result).toBeUndefined()
    expect(mockStorageBucket.remove).not.toHaveBeenCalled()
  })

  it('retorna true al eliminar archivos exitosamente', async () => {
    // Arrange
    mockStorageBucket.remove.mockResolvedValue({ error: null })

    // Act
    const result = await storageRepository.deleteFiles(['u1/note3/slides.pdf'])

    // Assert
    expect(result).toBe(true)
    expect(mockStorageBucket.remove).toHaveBeenCalledWith(['u1/note3/slides.pdf'])
  })
})

// ─── createSignedUrl ───────────────────────────────────────────────────────

describe('storageRepository — createSignedUrl', () => {
  it('retorna la URL firmada', async () => {
    // Arrange
    const fakeUrl = 'https://supabase.co/storage/signed/u1/slides.pdf?token=abc'
    mockStorageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: fakeUrl },
      error: null,
    })

    // Act
    const result = await storageRepository.createSignedUrl('u1/slides.pdf', 3600)

    // Assert
    expect(result).toBe(fakeUrl)
    expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith('u1/slides.pdf', 3600)
  })

  it('lanza error cuando Supabase falla al generar la URL', async () => {
    // Arrange
    mockStorageBucket.createSignedUrl.mockResolvedValue({ data: null, error: new Error('Acceso denegado') })

    // Act & Assert
    await expect(storageRepository.createSignedUrl('path', 3600)).rejects.toThrow('Acceso denegado')
  })
})
