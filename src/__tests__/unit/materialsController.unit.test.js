import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/materialsService.js', () => ({
  default: {
    uploadMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
  }
}))

vi.mock('../../repository/storageRepository.js', () => ({
  default: {
    uploadFile: vi.fn(),
    createSignedUrl: vi.fn(),
  }
}))

import materialsService from '../../service/materialsService.js'
import storageRepository from '../../repository/storageRepository.js'
import controller from '../../controller/materialsController.js'

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── uploadMaterial ──────────────────────────────────────────────────────────

describe('materialsController — uploadMaterial', () => {
  it('responde 201 con el material creado y parsea note_id a entero', async () => {
    materialsService.uploadMaterial.mockResolvedValue({ id: 'm1', file_name: 'doc.pdf' })
    const file = { originalname: 'doc.pdf', buffer: Buffer.from('') }
    const req = { userId: 'u1', params: { note_id: '5' }, file }
    const res = mockRes()
    await controller.uploadMaterial(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(materialsService.uploadMaterial).toHaveBeenCalledWith(5, file, 'u1')
  })

  it('delega a next cuando el service lanza un error', async () => {
    const err = new Error('nota no encontrada')
    err.status = 404
    materialsService.uploadMaterial.mockRejectedValue(err)
    const req = { userId: 'u1', params: { note_id: '5' }, file: {} }
    const res = mockRes()
    const next = vi.fn()
    await controller.uploadMaterial(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── deleteMaterial ──────────────────────────────────────────────────────────

describe('materialsController — deleteMaterial', () => {
  it('responde 204 al eliminar exitosamente y parsea material_id a entero', async () => {
    materialsService.deleteMaterial.mockResolvedValue(undefined)
    const req = { userId: 'u1', params: { material_id: '9' } }
    const res = mockRes()
    await controller.deleteMaterial(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(materialsService.deleteMaterial).toHaveBeenCalledWith(9, 'u1')
  })
})

// ─── uploadTempFile ──────────────────────────────────────────────────────────

describe('materialsController — uploadTempFile', () => {
  it('responde 400 cuando no se adjunta archivo', async () => {
    const req = { userId: 'u1', file: null }
    const res = mockRes()
    await controller.uploadTempFile(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/archivo/i) }))
  })

  it('responde 201 con la URL firmada del archivo temporal', async () => {
    // Arrange
    storageRepository.uploadFile.mockResolvedValue(undefined)
    storageRepository.createSignedUrl.mockResolvedValue('https://signed.url/temp.pdf')
    const file = { originalname: 'malla.pdf', buffer: Buffer.from(''), mimetype: 'application/pdf' }
    const req = { userId: 'u1', file }
    const res = mockRes()
    // Act
    await controller.uploadTempFile(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ file_url: 'https://signed.url/temp.pdf' })
  })
})
