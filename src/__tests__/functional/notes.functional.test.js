import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — única dependencia externa ────────────────────────────────
const mockSb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'
const USER_ID = 'test-user-id'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOTE_BASE = { id: 5, title: 'Notas Cálculo', student_id: USER_ID, subject_id: 's1', content_text: '' }
const NOTE_FULL = { ...NOTE_BASE, note_tags: [], material: [], child_notes: [] }
const NOTE_UPDATED = { ...NOTE_FULL, title: 'Notas Cálculo — Límites' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Simula checkSubjectOwnership: select.eq.eq.maybeSingle (join con curriculum)
function makeSubjectOwnershipMock(found = true) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: found ? { id: 's1' } : null, error: null,
  })
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    }),
  }
}

// Simula checkNoteOwnership: select.eq.eq.maybeSingle (join con subjects → curriculum)
function makeNoteOwnershipMock(found = true) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: found ? { id: 5 } : null, error: null,
  })
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    }),
  }
}

// Simula getNoteById: select.eq.single (con selección completa)
function makeNoteDetailMock(note = NOTE_FULL) {
  const single = vi.fn().mockResolvedValue({ data: note, error: null })
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ single }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } }, error: null,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 1: Crear nota → actualizar → eliminar
// ─────────────────────────────────────────────────────────────────────────────

describe('T4 — Flujo: crear nota → actualizar título → eliminar', () => {
  it('el estudiante crea una nota, la edita y la elimina limpiando solo lo necesario', async () => {

    // ── Paso 1: Crear nota ────────────────────────────────────────────────────
    // Arrange: subjects (ownership) + notes (insert + getNoteById)
    // from('notes') se llama 2 veces: 1ª insert, 2ª getNoteById final
    let notesCallCreate = 0
    mockSb.from.mockImplementation((table) => {
      if (table === 'subjects') return makeSubjectOwnershipMock(true)
      if (table === 'notes') {
        notesCallCreate++
        if (notesCallCreate === 1) {
          // createNote: insert.select.single
          const single = vi.fn().mockResolvedValue({ data: NOTE_BASE, error: null })
          return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }) }
        }
        // getNoteById: select.eq.single
        return makeNoteDetailMock(NOTE_FULL)
      }
    })
    // Act
    const createRes = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ subject_id: 's1', title: 'Notas Cálculo', content_text: '' })
    // Assert — service crea la nota y retorna el detalle completo
    expect(createRes.status).toBe(201)
    expect(createRes.body).toMatchObject({ id: 5, title: 'Notas Cálculo' })
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
    expect(mockSb.from).toHaveBeenCalledWith('notes')

    // ── Paso 2: Actualizar el título de la nota ───────────────────────────────
    // Arrange: from('notes') se llama 3 veces: ownership + update + getNoteById
    let notesCallUpdate = 0
    mockSb.from.mockImplementation((table) => {
      if (table === 'notes') {
        notesCallUpdate++
        if (notesCallUpdate === 1) return makeNoteOwnershipMock(true)     // _verifyNoteOwnership
        if (notesCallUpdate === 2) {
          // updateNote: update.eq.select.single
          const single = vi.fn().mockResolvedValue({
            data: { ...NOTE_BASE, title: 'Notas Cálculo — Límites' }, error: null,
          })
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
            }),
          }
        }
        return makeNoteDetailMock(NOTE_UPDATED)                           // getNoteById final
      }
    })
    // Act
    const updateRes = await request(app)
      .put('/5')
      .set('Authorization', TOKEN)
      .send({ title: 'Notas Cálculo — Límites' })
    // Assert — service filtró campos y actualizó; retorna nota completa actualizada
    expect(updateRes.status).toBe(200)
    expect(updateRes.body).toMatchObject({ title: 'Notas Cálculo — Límites' })

    // ── Paso 3: Eliminar la nota (sin materiales → no toca Storage) ───────────
    // Arrange: from('notes') ownership + from('material') sin archivos + from('notes') delete
    let notesCallDelete = 0
    mockSb.from.mockImplementation((table) => {
      if (table === 'notes') {
        notesCallDelete++
        if (notesCallDelete === 1) return makeNoteOwnershipMock(true)     // _verifyNoteOwnership
        // deleteNote: delete.eq
        return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }
      }
      if (table === 'material') {
        // getMaterialsByNoteId → [] (sin archivos, no se invoca Storage)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
    })
    // Act
    const deleteRes = await request(app).delete('/5').set('Authorization', TOKEN)
    // Assert — 204 sin body; Storage no fue tocado (no había materiales)
    expect(deleteRes.status).toBe(204)
    expect(mockSb.from).toHaveBeenCalledWith('notes')
    expect(mockSb.from).toHaveBeenCalledWith('material')
    expect(mockSb.storage.from).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 2: Validaciones de negocio
// ─────────────────────────────────────────────────────────────────────────────

describe('T4 — Flujo: validaciones bloquean creación con datos inválidos', () => {
  it('campos faltantes → 400, asignatura ajena → 403: ninguno toca la tabla notes', async () => {

    // ── Paso 1: Sin campos requeridos → service rechaza antes de Supabase ─────
    const missingFields = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ content_text: 'sin título ni asignatura' })
    expect(missingFields.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()

    // ── Paso 2: Asignatura no pertenece al estudiante → service rechaza (403) ─
    vi.clearAllMocks()
    mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mockSb.from.mockImplementation((table) => {
      if (table === 'subjects') return makeSubjectOwnershipMock(false)  // no es dueño
    })
    const notOwner = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ subject_id: 's1', title: 'Nota ajena' })
    expect(notOwner.status).toBe(403)
    // subjects fue consultado, notes nunca llegó a ejecutarse
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
    expect(mockSb.from).not.toHaveBeenCalledWith('notes')
  })
})
