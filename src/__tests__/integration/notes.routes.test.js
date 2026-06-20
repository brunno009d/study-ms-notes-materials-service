import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — ÚNICA dependencia externa ────────────────────────────────
// Todo el código real de controller → service → repository se ejecuta sin cambios.
// Solo el cliente de Supabase está mockeado.
const mockSb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from:    vi.fn(),
  storage: { from: vi.fn() },
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'
const USER_ID = 'test-user-id'

// ─── Helpers para construir la cadena de Supabase ─────────────────────────────

/**
 * Devuelve un objeto que simula la cadena fluida de Supabase para `from()`.
 *
 * Hay dos tipos de terminación en el código real:
 *   - .single() / .maybeSingle()  → retornan una promesa ({ data, error })
 *   - La cadena en sí es awaited  → para queries que terminan con .order(),
 *     .eq(), etc. sin llamar a single (ej: getNotesBySubject, getTags, delete)
 *
 * Para cubrir ambos casos hacemos que el chain sea una "thenable" que resuelve
 * con `resolvedValue`, Y también exponemos .single() / .maybeSingle() que
 * resuelven igual.
 */
function makeQueryChain(resolvedValue) {
  // Promesa que resuelve con el valor deseado — usada para await directo
  const promise = Promise.resolve(resolvedValue)

  const chain = {
    // Terminadores explícitos
    single:      vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),

    // El chain en sí es thenable → soporta `await chain`
    then:  promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  }

  // Todos los métodos builder devuelven el mismo chain
  const builder = vi.fn().mockReturnValue(chain)
  chain.select  = builder
  chain.insert  = builder
  chain.update  = builder
  chain.delete  = builder
  chain.eq      = builder
  chain.is      = builder
  chain.order   = builder
  chain.gte     = builder
  chain.lte     = builder
  chain.or      = builder

  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Auth válida por defecto — requireAuth pasa en todos los tests salvo los de auth
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } }, error: null,
  })
})

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth — middleware chain', () => {
  it('401 — sin header la petición no llega al controller ni a supabase.from', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'unauthorized')
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('401 — con token inválido: Supabase auth rechaza y nada más se ejecuta', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Token inválido') })
    const res = await request(app).get('/').set('Authorization', TOKEN)
    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── GET /subject/:subject_id ─────────────────────────────────────────────────

describe('GET /subject/:subject_id', () => {
  it('200 — cadena completa: requireAuth → service → repository → supabase.from', async () => {
    // Arrange — subject ownership check devuelve asignatura válida
    const ownershipChain = makeQueryChain({ data: { id: 3 }, error: null })
    // Lista de notas del ramo
    const notesChain = makeQueryChain({ data: [{ id: 5, title: 'Resumen Tema 1' }], error: null })

    mockSb.from
      .mockReturnValueOnce(ownershipChain)  // checkSubjectOwnership → subjects
      .mockReturnValueOnce(notesChain)       // getNotesBySubject → notes

    // Act
    const res = await request(app).get('/subject/3').set('Authorization', TOKEN)

    // Assert — el pipeline completo llegó hasta Supabase
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ id: 5, title: 'Resumen Tema 1' })
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
    expect(mockSb.from).toHaveBeenCalledWith('notes')
  })

  it('403 — service lanza error cuando la asignatura no pertenece al usuario', async () => {
    // Arrange — checkSubjectOwnership devuelve null → service lanza 403
    const ownershipChain = makeQueryChain({ data: null, error: null })
    mockSb.from.mockReturnValueOnce(ownershipChain)

    const res = await request(app).get('/subject/99').set('Authorization', TOKEN)

    expect(res.status).toBe(403)
    // supabase.from('notes') nunca debe llamarse
    expect(mockSb.from).toHaveBeenCalledTimes(1)
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
  })
})

// ─── POST / ───────────────────────────────────────────────────────────────────

describe('POST /', () => {
  it('201 — service valida, verifica ownership y repository inserta en BD', async () => {
    // Arrange
    const ownershipChain = makeQueryChain({ data: { id: 3 }, error: null })
    const insertChain    = makeQueryChain({ data: { id: 10, title: 'Apuntes', subject_id: 3 }, error: null })
    // getNoteById al final del createNote
    const getByIdChain   = makeQueryChain({ data: { id: 10, title: 'Apuntes', note_tags: [], material: [] }, error: null })

    mockSb.from
      .mockReturnValueOnce(ownershipChain)  // checkSubjectOwnership
      .mockReturnValueOnce(insertChain)      // createNote → insert
      .mockReturnValueOnce(getByIdChain)     // getNoteById → select

    // Act
    const res = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ subject_id: 3, title: 'Apuntes' })

    // Assert — el insert llegó a Supabase
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 10, title: 'Apuntes' })
    expect(mockSb.from).toHaveBeenCalledWith('notes')
  })

  it('400 — service rechaza body sin subject_id antes de tocar supabase.from', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ title: 'Sin ramo' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'validation_error')
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('400 — service rechaza body sin title antes de tocar supabase.from', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', TOKEN)
      .send({ subject_id: 3 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'validation_error')
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe('GET /:id', () => {
  it('200 — service verifica ownership y devuelve la nota con signed URLs', async () => {
    // Arrange
    const ownershipChain = makeQueryChain({ data: { id: 6 }, error: null })
    const noteChain = makeQueryChain({
      data: { id: 6, title: 'Mi nota', material: [{ id: 'm1', bucket_url: 'u1/n6/doc.pdf' }] },
      error: null,
    })

    mockSb.from
      .mockReturnValueOnce(ownershipChain)
      .mockReturnValueOnce(noteChain)

    // Arrange — storage signed URL
    const storageBucketMock = { createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/doc.pdf' }, error: null }) }
    mockSb.storage.from.mockReturnValue(storageBucketMock)

    // Act
    const res = await request(app).get('/6').set('Authorization', TOKEN)

    // Assert — llegó hasta Storage para generar el signed URL
    expect(res.status).toBe(200)
    expect(res.body.material[0]).toHaveProperty('signed_url', 'https://signed.url/doc.pdf')
    expect(mockSb.storage.from).toHaveBeenCalledWith('academic-resources')
  })

  it('404 — service lanza 404 cuando la nota no pertenece al usuario', async () => {
    const ownershipChain = makeQueryChain({ data: null, error: null })
    mockSb.from.mockReturnValueOnce(ownershipChain)

    const res = await request(app).get('/999').set('Authorization', TOKEN)

    expect(res.status).toBe(404)
    expect(mockSb.from).toHaveBeenCalledTimes(1)
  })
})

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

describe('PUT /:id', () => {
  it('200 — service filtra campos no permitidos y update llega a Supabase solo con los válidos', async () => {
    // Arrange
    const ownershipChain = makeQueryChain({ data: { id: 6 }, error: null })
    const updateChain    = makeQueryChain({ data: { id: 6, title: 'Editado' }, error: null })
    const getByIdChain   = makeQueryChain({ data: { id: 6, title: 'Editado', note_tags: [], material: [] }, error: null })

    // Necesitamos capturar el chain de update para verificar qué datos recibió
    let capturedUpdateData
    const spyUpdateChain = {
      ...updateChain,
      update: vi.fn().mockImplementation((data) => {
        capturedUpdateData = data
        return updateChain
      }),
    }

    mockSb.from
      .mockReturnValueOnce(ownershipChain)     // checkNoteOwnership
      .mockReturnValueOnce(spyUpdateChain)     // updateNote → update
      .mockReturnValueOnce(getByIdChain)        // getNoteById → select

    // Act
    const res = await request(app)
      .put('/6')
      .set('Authorization', TOKEN)
      .send({ title: 'Editado', campo_hack: 'evil' })

    // Assert — solo 'title' pasó el filtro del service
    expect(res.status).toBe(200)
    expect(capturedUpdateData).toEqual({ title: 'Editado' })
    expect(capturedUpdateData).not.toHaveProperty('campo_hack')
  })
})

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe('DELETE /:id', () => {
  it('204 — service verifica ownership, recupera materiales, borra Storage y llama delete en BD', async () => {
    // Arrange — nota existe y pertenece al usuario, tiene un material
    const ownershipChain  = makeQueryChain({ data: { id: 6 }, error: null })
    const materialsChain  = makeQueryChain({ data: [{ bucket_url: 'u1/6/file.pdf' }], error: null })
    const deleteNoteChain = makeQueryChain({ data: null, error: null })

    mockSb.from
      .mockReturnValueOnce(ownershipChain)   // checkNoteOwnership
      .mockReturnValueOnce(materialsChain)   // getMaterialsByNoteId
      .mockReturnValueOnce(deleteNoteChain)  // deleteNote → delete

    // Storage delete
    const storageBucketMock = { remove: vi.fn().mockResolvedValue({ data: {}, error: null }) }
    mockSb.storage.from.mockReturnValue(storageBucketMock)

    // Act
    const res = await request(app).delete('/6').set('Authorization', TOKEN)

    // Assert — el flujo completo: ownership → materiales → storage.remove → delete BD
    expect(res.status).toBe(204)
    expect(storageBucketMock.remove).toHaveBeenCalledWith(['u1/6/file.pdf'])
    expect(mockSb.from).toHaveBeenCalledWith('notes')
    expect(mockSb.from).toHaveBeenCalledWith('material')
  })

  it('204 — nota sin materiales no llama a Storage', async () => {
    const ownershipChain  = makeQueryChain({ data: { id: 6 }, error: null })
    const materialsChain  = makeQueryChain({ data: [], error: null })
    const deleteNoteChain = makeQueryChain({ data: null, error: null })

    mockSb.from
      .mockReturnValueOnce(ownershipChain)
      .mockReturnValueOnce(materialsChain)
      .mockReturnValueOnce(deleteNoteChain)

    const res = await request(app).delete('/6').set('Authorization', TOKEN)

    expect(res.status).toBe(204)
    expect(mockSb.storage.from).not.toHaveBeenCalled()
  })
})

// ─── Tags — GET /tags ─────────────────────────────────────────────────────────

describe('GET /tags', () => {
  it('200 — cadena completa llega hasta supabase.from(tags)', async () => {
    const tagsChain = makeQueryChain({ data: [{ id: 1, name: 'Matemáticas', color_hex: '#ff0000' }], error: null })
    mockSb.from.mockReturnValueOnce(tagsChain)

    const res = await request(app).get('/tags').set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(mockSb.from).toHaveBeenCalledWith('tags')
  })
})

// ─── Tags — POST /tags ────────────────────────────────────────────────────────

describe('POST /tags', () => {
  it('201 — service valida nombre y repository inserta en BD', async () => {
    const insertChain = makeQueryChain({ data: { id: 2, name: 'Física', student_id: USER_ID }, error: null })
    mockSb.from.mockReturnValueOnce(insertChain)

    const res = await request(app)
      .post('/tags')
      .set('Authorization', TOKEN)
      .send({ name: 'Física', color_hex: '#00ff00' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 2, name: 'Física' })
    expect(mockSb.from).toHaveBeenCalledWith('tags')
  })

  it('400 — service rechaza nombre vacío antes de tocar supabase.from', async () => {
    const res = await request(app)
      .post('/tags')
      .set('Authorization', TOKEN)
      .send({ name: '   ' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'validation_error')
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── Tags — DELETE /tags/:id ──────────────────────────────────────────────────

describe('DELETE /tags/:id', () => {
  it('204 — service verifica ownership sobre la tag y repository la elimina', async () => {
    // tagsService.deleteTag: primero getTagById, luego deleteTag
    const getTagChain    = makeQueryChain({ data: { id: 1, name: 'Física', student_id: USER_ID }, error: null })
    const deleteTagChain = makeQueryChain({ data: null, error: null })

    mockSb.from
      .mockReturnValueOnce(getTagChain)
      .mockReturnValueOnce(deleteTagChain)

    const res = await request(app).delete('/tags/1').set('Authorization', TOKEN)

    expect(res.status).toBe(204)
    expect(mockSb.from).toHaveBeenCalledWith('tags')
  })

  it('403 — service rechaza eliminar tag de otro usuario antes de borrar en BD', async () => {
    // Tag pertenece a otro usuario
    const getTagChain = makeQueryChain({ data: { id: 1, name: 'Física', student_id: 'otro-user' }, error: null })
    mockSb.from.mockReturnValueOnce(getTagChain)

    const res = await request(app).delete('/tags/1').set('Authorization', TOKEN)

    expect(res.status).toBe(403)
    // Solo un from() — el segundo (delete) nunca se invoca
    expect(mockSb.from).toHaveBeenCalledTimes(1)
  })
})
