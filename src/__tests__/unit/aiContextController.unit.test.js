import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repository/notesRepository.js', () => ({
  default: { getAllNotesByStudentId: vi.fn() }
}))

import notesRepository from '../../repository/notesRepository.js'
import { getContext }  from '../../controller/aiContextController.js'

const makeRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json   = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── getContext ────────────────────────────────────────────────────────────────

describe('aiContextController — getContext', () => {
  it('200 — retorna total y lista de notas del estudiante', async () => {
    // Arrange
    const notes = [{ id: 1, title: 'Apunte 1' }, { id: 2, title: 'Apunte 2' }]
    notesRepository.getAllNotesByStudentId.mockResolvedValue(notes)
    const req = { userId: 'u1' }
    const res = makeRes()
    // Act
    await getContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ total_notes: 2, notes })
  })

  it('200 — retorna total 0 cuando no hay notas', async () => {
    // Arrange
    notesRepository.getAllNotesByStudentId.mockResolvedValue([])
    const req = { userId: 'u1' }
    const res = makeRes()
    // Act
    await getContext(req, res, vi.fn())
    // Assert
    expect(res.json).toHaveBeenCalledWith({ total_notes: 0, notes: [] })
  })

  it('delega a next en error inesperado', async () => {
    // Arrange
    const err = new Error('DB fail')
    notesRepository.getAllNotesByStudentId.mockRejectedValue(err)
    const next = vi.fn()
    // Act
    await getContext({ userId: 'u1' }, makeRes(), next)
    // Assert
    expect(next).toHaveBeenCalledWith(err)
  })
})
