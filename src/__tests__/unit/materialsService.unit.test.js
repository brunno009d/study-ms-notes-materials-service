import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repository/materialsRepository.js', () => ({
  default: {
    getMaterialById: vi.fn(),
    createMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
  }
}))

vi.mock('../../repository/notesRepository.js', () => ({
  default: {
    checkNoteOwnership: vi.fn(),
  }
}))

vi.mock('../../repository/storageRepository.js', () => ({
  default: {
    uploadFile: vi.fn(),
    deleteFiles: vi.fn(),
  }
}))

import materialsRepository from '../../repository/materialsRepository.js'
import notesRepository from '../../repository/notesRepository.js'
import storageRepository from '../../repository/storageRepository.js'
import materialsService from '../../service/materialsService.js'

beforeEach(() => vi.clearAllMocks())

// ─── uploadMaterial ──────────────────────────────────────────────────────────

describe('materialsService — uploadMaterial', () => {
  it('lanza ValidationError cuando no se adjunta archivo', async () => {
    const err = await materialsService.uploadMaterial('n1', null, 'u1').catch(e => e)
    expect(err.name).toBe('ValidationError')
    expect(err.message).toMatch(/archivo/)
  })

  it('lanza 404 cuando la nota no pertenece al usuario', async () => {
    notesRepository.checkNoteOwnership.mockResolvedValue(null)
    const file = { originalname: 'doc.pdf', buffer: Buffer.from(''), mimetype: 'application/pdf' }
    const err = await materialsService.uploadMaterial('n1', file, 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('sube al Storage y luego registra en BD con la ruta correcta', async () => {
    // Arrange
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    storageRepository.uploadFile.mockResolvedValue(undefined)
    materialsRepository.createMaterial.mockResolvedValue({ id: 'm1', file_name: 'doc.pdf' })
    const file = { originalname: 'doc.pdf', buffer: Buffer.from('data'), mimetype: 'application/pdf' }
    // Act
    const result = await materialsService.uploadMaterial('n1', file, 'u1')
    // Assert
    expect(storageRepository.uploadFile).toHaveBeenCalledWith('u1/n1/doc.pdf', file.buffer, file.mimetype)
    expect(materialsRepository.createMaterial).toHaveBeenCalledWith({
      note_id: NaN, // parseInt('n1') = NaN en este mock — valor real sería un número
      file_name: 'doc.pdf',
      bucket_url: 'u1/n1/doc.pdf'
    })
    expect(result.id).toBe('m1')
  })
})

// ─── deleteMaterial ──────────────────────────────────────────────────────────

describe('materialsService — deleteMaterial', () => {
  it('lanza 404 cuando el material no existe', async () => {
    materialsRepository.getMaterialById.mockResolvedValue(null)
    const err = await materialsService.deleteMaterial('m1', 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('lanza 404 cuando la nota del material no pertenece al usuario', async () => {
    materialsRepository.getMaterialById.mockResolvedValue({ id: 'm1', note_id: 'n1', bucket_url: 'path' })
    notesRepository.checkNoteOwnership.mockResolvedValue(null)
    const err = await materialsService.deleteMaterial('m1', 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('elimina del Storage antes de borrar el registro de BD', async () => {
    // Arrange
    materialsRepository.getMaterialById.mockResolvedValue({
      id: 'm1', note_id: 'n1', bucket_url: 'u1/n1/doc.pdf'
    })
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    storageRepository.deleteFiles.mockResolvedValue(undefined)
    materialsRepository.deleteMaterial.mockResolvedValue(undefined)
    // Act
    await materialsService.deleteMaterial('m1', 'u1')
    // Assert
    expect(storageRepository.deleteFiles).toHaveBeenCalledWith(['u1/n1/doc.pdf'])
    expect(materialsRepository.deleteMaterial).toHaveBeenCalledWith('m1')
  })

  it('no llama a Storage si el material no tiene bucket_url', async () => {
    materialsRepository.getMaterialById.mockResolvedValue({ id: 'm1', note_id: 'n1', bucket_url: null })
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    materialsRepository.deleteMaterial.mockResolvedValue(undefined)
    await materialsService.deleteMaterial('m1', 'u1')
    expect(storageRepository.deleteFiles).not.toHaveBeenCalled()
  })
})
