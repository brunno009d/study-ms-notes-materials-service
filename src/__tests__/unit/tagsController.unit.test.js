import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/tagsService.js', () => ({
  default: {
    getTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  }
}))

import tagsService from '../../service/tagsService.js'
import controller from '../../controller/tagsController.js'

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── getTags ──────────────────────────────────────────────────────────────────

describe('tagsController — getTags', () => {
  it('responde 200 con las etiquetas del usuario', async () => {
    tagsService.getTags.mockResolvedValue([{ id: 1, name: 'Exámenes' }])
    const req = { userId: 'u1' }
    const res = mockRes()
    await controller.getTags(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(tagsService.getTags).toHaveBeenCalledWith('u1')
  })
})

// ─── createTag ────────────────────────────────────────────────────────────────

describe('tagsController — createTag', () => {
  it('responde 201 con la etiqueta creada', async () => {
    tagsService.createTag.mockResolvedValue({ id: 1, name: 'Exámenes' })
    const req = { userId: 'u1', body: { name: 'Exámenes', color_hex: '#FF0' } }
    const res = mockRes()
    await controller.createTag(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(tagsService.createTag).toHaveBeenCalledWith({ name: 'Exámenes', color_hex: '#FF0' }, 'u1')
  })

  it('delega a next cuando el service lanza un error', async () => {
    const err = new Error('nombre requerido')
    tagsService.createTag.mockRejectedValue(err)
    const req = { userId: 'u1', body: {} }
    const res = mockRes()
    const next = vi.fn()
    await controller.createTag(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── updateTag ────────────────────────────────────────────────────────────────

describe('tagsController — updateTag', () => {
  it('responde 200 con la etiqueta actualizada y parsea id a entero', async () => {
    tagsService.updateTag.mockResolvedValue({ id: 3, name: 'Tareas' })
    const req = { userId: 'u1', params: { id: '3' }, body: { name: 'Tareas' } }
    const res = mockRes()
    await controller.updateTag(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(tagsService.updateTag).toHaveBeenCalledWith(3, { name: 'Tareas' }, 'u1')
  })
})

// ─── deleteTag ────────────────────────────────────────────────────────────────

describe('tagsController — deleteTag', () => {
  it('responde 204 al eliminar exitosamente y parsea id a entero', async () => {
    tagsService.deleteTag.mockResolvedValue(undefined)
    const req = { userId: 'u1', params: { id: '3' } }
    const res = mockRes()
    await controller.deleteTag(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(tagsService.deleteTag).toHaveBeenCalledWith(3, 'u1')
  })
})
