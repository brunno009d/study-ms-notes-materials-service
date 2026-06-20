import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockSb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) }),
  },
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'
const USER_ID = 'test-user-id'

// Helper: subjects ownership → select.eq.eq.maybeSingle (join curriculum)
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

// Helper: notes ownership → select.eq.eq.maybeSingle (join subjects → curriculum)
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
})

describe('Regresión — bugs corregidos en notes-materials-service', () => {

  it('[BUG-001] createNote sin "title" retorna 400 sin tocar Supabase', async () => {
    // Bug: la ausencia de title no era validada; el insert llegaba con title=undefined
    // y Supabase rechazaba con un error 500 no controlado.
    // Fix: validación de campos requeridos (subject_id y title) al inicio del service.
    const res = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ subject_id: 's1' })  // falta title

    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('[BUG-002] createNote sin "subject_id" retorna 400 sin tocar Supabase', async () => {
    // Bug: sin subject_id no había a qué asignatura vincular la nota; el service
    // intentaba el ownership check con undefined y producía un 500.
    // Fix: validación de campo requerido antes del ownership check.
    const res = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ title: 'Notas sin asignatura' })  // falta subject_id

    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('[BUG-003] createNote en asignatura ajena retorna 403 sin insertar la nota', async () => {
    // Bug: _verifySubjectOwnership no existía; cualquier estudiante podía agregar
    // notas a asignaturas de otro conociendo su subject_id.
    // Fix: verificar subjects.curriculum.student_id === userId antes del insert.
    mockSb.from.mockImplementation((table) => {
      if (table === 'subjects') return makeSubjectOwnershipMock(false)  // no es dueño
    })

    const res = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ subject_id: 's1', title: 'Nota ajena' })

    expect(res.status).toBe(403)
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
    expect(mockSb.from).not.toHaveBeenCalledWith('notes')
  })

  it('[BUG-004] updateNote en nota ajena retorna 404 sin modificar datos', async () => {
    // Bug: _verifyNoteOwnership no existía; un estudiante podía editar notas de otro
    // conociendo el ID de la nota.
    // Fix: verificar notes.subjects.curriculum.student_id === userId antes del update.
    // El service retorna 404 (no 403) para no revelar que el recurso existe pero es ajeno.
    mockSb.from.mockImplementation((table) => {
      if (table === 'notes') return makeNoteOwnershipMock(false)  // nota no encontrada para este usuario
    })

    const res = await request(app)
      .put('/5')
      .set('Authorization', TOKEN)
      .send({ title: 'Título modificado' })

    expect(res.status).toBe(404)
    // el único call fue el ownership check; nunca llegó al update
    expect(mockSb.from).toHaveBeenCalledTimes(1)
  })

})
