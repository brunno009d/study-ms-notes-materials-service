import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock supabase (requireAuth) ──────────────────────────────────────────────
const mockSb = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))
vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

// ─── Mock servicios ───────────────────────────────────────────────────────────
vi.mock('../../service/notesService.js', () => ({
  default: {
    createNote:               vi.fn(),
    getNoteById:              vi.fn(),
    updateNote:               vi.fn(),
    deleteNote:               vi.fn(),
    getNotesBySubject:        vi.fn(),
    getNoteContentsForSummary: vi.fn(),
    getFilteredNotes:         vi.fn(),
  }
}))

vi.mock('../../service/tagsService.js', () => ({
  default: {
    getTags:   vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  }
}))

vi.mock('../../service/materialsService.js', () => ({
  default: {
    uploadMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
  }
}))

// storageRepository — usado directamente en uploadTempFile
vi.mock('../../repository/storageRepository.js', () => ({
  default: {
    uploadFile:      vi.fn(),
    createSignedUrl: vi.fn(),
  }
}))

import notesService from '../../service/notesService.js'
import tagsService from '../../service/tagsService.js'
import app from '../../app.js'

const AUTH = { Authorization: 'Bearer test-token' }

beforeEach(() => {
  vi.clearAllMocks()
  mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
})

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth — rutas protegidas', () => {
  it('retorna 401 sin header en ruta de notas', async () => {
    const res = await request(app).get('/subject/1')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'unauthorized')
  })

  it('retorna 401 sin header en ruta de tags', async () => {
    const res = await request(app).get('/tags')
    expect(res.status).toBe(401)
  })

  it('retorna 401 con token inválido', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Bad token') })
    const res = await request(app).get('/tags').set(AUTH)
    expect(res.status).toBe(401)
  })
})

// ─── Tags ─────────────────────────────────────────────────────────────────────

describe('GET /tags', () => {
  it('retorna 200 con las etiquetas del usuario', async () => {
    tagsService.getTags.mockResolvedValue([{ id: 1, name: 'Matemáticas', color_hex: '#ff0000' }])
    const res = await request(app).get('/tags').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(tagsService.getTags).toHaveBeenCalledWith('test-user-id')
  })
})

describe('POST /tags', () => {
  it('retorna 201 al crear una etiqueta', async () => {
    tagsService.createTag.mockResolvedValue({ id: 2, name: 'Ciencias', student_id: 'test-user-id' })
    const res = await request(app).post('/tags').set(AUTH).send({ name: 'Ciencias' })
    // Controller: createTag(req.body, userId)
    expect(res.status).toBe(201)
    expect(tagsService.createTag).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ciencias' }), 'test-user-id'
    )
  })
})

describe('PUT /tags/:id', () => {
  it('retorna 200 al actualizar la etiqueta', async () => {
    tagsService.updateTag.mockResolvedValue({ id: 1, name: 'Matemáticas II' })
    const res = await request(app).put('/tags/1').set(AUTH).send({ name: 'Matemáticas II' })
    // Controller: updateTag(parseInt(id), req.body, userId)
    expect(res.status).toBe(200)
    expect(tagsService.updateTag).toHaveBeenCalledWith(1, expect.any(Object), 'test-user-id')
  })
})

describe('DELETE /tags/:id', () => {
  it('retorna 204 al eliminar la etiqueta', async () => {
    tagsService.deleteTag.mockResolvedValue({ deleted: true })
    const res = await request(app).delete('/tags/1').set(AUTH)
    // Controller: deleteTag(parseInt(id), userId)
    expect(res.status).toBe(204)
    expect(tagsService.deleteTag).toHaveBeenCalledWith(1, 'test-user-id')
  })
})

// ─── Notas ────────────────────────────────────────────────────────────────────

describe('GET /subject/:subject_id', () => {
  it('retorna 200 con las notas del ramo', async () => {
    notesService.getNotesBySubject.mockResolvedValue([{ id: 5, title: 'Resumen Tema 1' }])
    const res = await request(app).get('/subject/3').set(AUTH)
    // Controller: getNotesBySubject(parseInt(subject_id), userId)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(notesService.getNotesBySubject).toHaveBeenCalledWith(3, 'test-user-id')
  })
})

describe('POST /', () => {
  it('retorna 201 al crear una nota correctamente', async () => {
    notesService.createNote.mockResolvedValue({ id: 6, title: 'Apuntes Clase 1', subject_id: 3 })
    const res = await request(app)
      .post('/')
      .set(AUTH)
      .send({ title: 'Apuntes Clase 1', subject_id: 3 })
    // Controller: createNote(req.body, userId)
    expect(res.status).toBe(201)
    expect(notesService.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Apuntes Clase 1' }), 'test-user-id'
    )
  })
})

describe('GET /:id', () => {
  it('retorna 200 con el detalle de la nota', async () => {
    notesService.getNoteById.mockResolvedValue({ id: 6, title: 'Apuntes Clase 1', materials: [] })
    const res = await request(app).get('/6').set(AUTH)
    // Controller: getNoteById(parseInt(id), userId)
    expect(res.status).toBe(200)
    expect(notesService.getNoteById).toHaveBeenCalledWith(6, 'test-user-id')
  })
})

describe('PUT /:id', () => {
  it('retorna 200 al actualizar la nota', async () => {
    notesService.updateNote.mockResolvedValue({ id: 6, title: 'Editado' })
    const res = await request(app).put('/6').set(AUTH).send({ title: 'Editado' })
    // Controller: updateNote(parseInt(id), req.body, userId)
    expect(res.status).toBe(200)
    expect(notesService.updateNote).toHaveBeenCalledWith(6, expect.any(Object), 'test-user-id')
  })
})

describe('DELETE /:id', () => {
  it('retorna 204 al eliminar la nota', async () => {
    notesService.deleteNote.mockResolvedValue({ deleted: true })
    const res = await request(app).delete('/6').set(AUTH)
    // Controller: deleteNote(parseInt(id), userId)
    expect(res.status).toBe(204)
    expect(notesService.deleteNote).toHaveBeenCalledWith(6, 'test-user-id')
  })
})
