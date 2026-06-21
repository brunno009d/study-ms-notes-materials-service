import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/notesService.js', () => ({
  default: {
    getNotesBySubject: vi.fn(),
    getNoteById: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    getNoteContentsForSummary: vi.fn(),
    getFilteredNotes: vi.fn(),
  }
}))

import notesService from '../../service/notesService.js'
import controller from '../../controller/notesController.js'

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── getNotesBySubject ────────────────────────────────────────────────────────

describe('notesController — getNotesBySubject', () => {
  it('responde 200 con las notas y parsea subject_id a entero', async () => {
    notesService.getNotesBySubject.mockResolvedValue([{ id: 1 }])
    const req = { userId: 'u1', params: { subject_id: '7' } }
    const res = mockRes()
    await controller.getNotesBySubject(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(notesService.getNotesBySubject).toHaveBeenCalledWith(7, 'u1')
  })
})

// ─── createNote ──────────────────────────────────────────────────────────────

describe('notesController — createNote', () => {
  it('responde 201 con la nota creada', async () => {
    notesService.createNote.mockResolvedValue({ id: 1, title: 'Mi nota' })
    const req = { userId: 'u1', body: { subject_id: 7, title: 'Mi nota' } }
    const res = mockRes()
    await controller.createNote(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('delega a next cuando el service lanza un error', async () => {
    const err = new Error('Campos requeridos faltantes')
    err.name = 'ValidationError'
    notesService.createNote.mockRejectedValue(err)
    const req = { userId: 'u1', body: {} }
    const res = mockRes()
    const next = vi.fn()
    await controller.createNote(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── getNoteById ─────────────────────────────────────────────────────────────

describe('notesController — getNoteById', () => {
  it('responde 200 con la nota y parsea id a entero', async () => {
    notesService.getNoteById.mockResolvedValue({ id: 5, title: 'Nota' })
    const req = { userId: 'u1', params: { id: '5' } }
    const res = mockRes()
    await controller.getNoteById(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(notesService.getNoteById).toHaveBeenCalledWith(5, 'u1')
  })
})

// ─── updateNote ──────────────────────────────────────────────────────────────

describe('notesController — updateNote', () => {
  it('responde 200 con la nota actualizada', async () => {
    notesService.updateNote.mockResolvedValue({ id: 5, title: 'Actualizado' })
    const req = { userId: 'u1', params: { id: '5' }, body: { title: 'Actualizado' } }
    const res = mockRes()
    await controller.updateNote(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(notesService.updateNote).toHaveBeenCalledWith(5, { title: 'Actualizado' }, 'u1')
  })
})

// ─── deleteNote ──────────────────────────────────────────────────────────────

describe('notesController — deleteNote', () => {
  it('responde 204 al eliminar exitosamente', async () => {
    notesService.deleteNote.mockResolvedValue(undefined)
    const req = { userId: 'u1', params: { id: '5' } }
    const res = mockRes()
    await controller.deleteNote(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(notesService.deleteNote).toHaveBeenCalledWith(5, 'u1')
  })
})

// ─── getFilteredNotes ─────────────────────────────────────────────────────────

describe('notesController — getFilteredNotes', () => {
  it('pasa filtros del query al service y responde 200', async () => {
    notesService.getFilteredNotes.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const req = {
      userId: 'u1',
      query: { subject_id: '7', tag_ids: '1,3', recent_days: '14' }
    }
    const res = mockRes()
    await controller.getFilteredNotes(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(notesService.getFilteredNotes).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ subject_id: 7, tag_ids: [1, 3], recent_days: 14 })
    )
  })

  it('pasa objeto de filtros vacío cuando no hay query params', async () => {
    notesService.getFilteredNotes.mockResolvedValue([])
    const req = { userId: 'u1', query: {} }
    const res = mockRes()
    await controller.getFilteredNotes(req, res, vi.fn())
    expect(notesService.getFilteredNotes).toHaveBeenCalledWith('u1', {})
  })
})

// ─── getNoteContentsForSummary ────────────────────────────────────────────────

describe('notesController — getNoteContentsForSummary', () => {
  it('pasa filtros del query al service y responde 200', async () => {
    notesService.getNoteContentsForSummary.mockResolvedValue([{ id: 1 }])
    const req = {
      userId: 'u1',
      params: { subject_id: '7' },
      query: { from_date: '2026-01-01', tag_ids: '1,2' }
    }
    const res = mockRes()
    await controller.getNoteContentsForSummary(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(notesService.getNoteContentsForSummary).toHaveBeenCalledWith(
      7, 'u1',
      expect.objectContaining({ from_date: '2026-01-01', tag_ids: [1, 2] })
    )
  })

  it('pasa objeto de filtros vacío cuando no hay query params', async () => {
    notesService.getNoteContentsForSummary.mockResolvedValue([])
    const req = { userId: 'u1', params: { subject_id: '7' }, query: {} }
    const res = mockRes()
    await controller.getNoteContentsForSummary(req, res, vi.fn())
    expect(notesService.getNoteContentsForSummary).toHaveBeenCalledWith(7, 'u1', {})
  })
})
