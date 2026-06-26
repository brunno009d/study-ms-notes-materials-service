import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import notesRepository from '../../repository/notesRepository.js'

const mockChain = (finalValue) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(finalValue).then(resolve, reject),
  }
  ;['select', 'update', 'insert', 'delete', 'eq', 'in', 'is', 'order', 'gte', 'lte', 'or'].forEach(
    (m) => { chain[m] = vi.fn().mockReturnValue(chain) }
  )
  chain.single      = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

// ─── checkSubjectOwnership ────────────────────────────────────────────────

describe('notesRepository — checkSubjectOwnership', () => {
  it('retorna el dato cuando el ramo pertenece al usuario', async () => {
    // Arrange
    const fakeData = { id: 5 }
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeData, error: null }))

    // Act
    const result = await notesRepository.checkSubjectOwnership(5, 'u1')

    // Assert
    expect(result).toEqual(fakeData)
  })

  it('retorna null cuando el ramo no pertenece al usuario', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: null }))

    // Act
    const result = await notesRepository.checkSubjectOwnership(5, 'u1')

    // Assert
    expect(result).toBeNull()
  })

  it('lanza error si falla la consulta', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Falla DB') }))

    // Act & Assert
    await expect(notesRepository.checkSubjectOwnership(5, 'u1')).rejects.toThrow('Falla DB')
  })
})

// ─── checkNoteOwnership ───────────────────────────────────────────────────

describe('notesRepository — checkNoteOwnership', () => {
  it('retorna el dato cuando la nota pertenece al usuario', async () => {
    // Arrange
    const fakeData = { id: 10 }
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeData, error: null }))

    // Act
    const result = await notesRepository.checkNoteOwnership(10, 'u1')

    // Assert
    expect(result).toEqual(fakeData)
  })

  it('lanza error si falla la consulta', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Falla checkNote') }))

    // Act & Assert
    await expect(notesRepository.checkNoteOwnership(10, 'u1')).rejects.toThrow('Falla checkNote')
  })
})

// ─── getNotesBySubject ─────────────────────────────────────────────────────

describe('notesRepository — getNotesBySubject', () => {
  it('retorna las notas del ramo', async () => {
    // Arrange
    const fakeNotes = [{ id: 1, title: 'Clase 1' }, { id: 2, title: 'Clase 2' }]
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeNotes, error: null }))

    // Act
    const result = await notesRepository.getNotesBySubject(10)

    // Assert
    expect(result).toHaveLength(2)
    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
  })

  it('retorna arreglo vacío cuando data es null', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: null }))

    // Act
    const result = await notesRepository.getNotesBySubject(10)

    // Assert
    expect(result).toEqual([])
  })
})

// ─── createNote ────────────────────────────────────────────────────────────

describe('notesRepository — createNote', () => {
  it('retorna la nota creada', async () => {
    // Arrange
    const newNote = { title: 'Apunte de clase', subject_id: 10, student_id: 'u1' }
    const created = { id: 3, ...newNote }
    mockSupabase.from.mockReturnValue(mockChain({ data: created, error: null }))

    // Act
    const result = await notesRepository.createNote(newNote)

    // Assert
    expect(result).toEqual(created)
  })

  it('lanza error cuando falla la creación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Error al insertar') }))

    // Act & Assert
    await expect(notesRepository.createNote({})).rejects.toThrow('Error al insertar')
  })
})

// ─── updateNote / deleteNote ───────────────────────────────────────────────

describe('notesRepository — updateNote', () => {
  it('retorna la nota actualizada', async () => {
    // Arrange
    const updated = { id: 3, title: 'Apunte actualizado' }
    mockSupabase.from.mockReturnValue(mockChain({ data: updated, error: null }))

    // Act
    const result = await notesRepository.updateNote(3, { title: 'Apunte actualizado' })

    // Assert
    expect(result).toEqual(updated)
  })

  it('lanza error cuando falla al actualizar', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Falla update') }))

    // Act & Assert
    await expect(notesRepository.updateNote(3, {})).rejects.toThrow('Falla update')
  })
})

describe('notesRepository — deleteNote', () => {
  it('retorna true al eliminar exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))

    // Act
    const result = await notesRepository.deleteNote(3)

    // Assert
    expect(result).toBe(true)
  })
})

// ─── linkTagsToNote ────────────────────────────────────────────────────────

describe('notesRepository — linkTagsToNote', () => {
  it('retorna true al vincular tags exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))

    // Act
    const result = await notesRepository.linkTagsToNote(3, [1, 2])

    // Assert
    expect(result).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('note_tags')
  })

  it('lanza error al fallar la vinculacion', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('Falla link') }))

    // Act & Assert
    await expect(notesRepository.linkTagsToNote(3, [1, 2])).rejects.toThrow('Falla link')
  })
})

// ─── deleteNoteTags ────────────────────────────────────────────────────────

describe('notesRepository — deleteNoteTags', () => {
  it('retorna true al eliminar tags exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))

    // Act
    const result = await notesRepository.deleteNoteTags(3)

    // Assert
    expect(result).toBe(true)
  })

  it('lanza error al fallar la eliminacion de tags', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('Falla deleteNoteTags') }))

    // Act & Assert
    await expect(notesRepository.deleteNoteTags(3)).rejects.toThrow('Falla deleteNoteTags')
  })
})

// ─── getFilteredNotes (filtrado JS por tag_ids) ───────────────────────────

describe('notesRepository — getFilteredNotes', () => {
  it('retorna todas las notas cuando no hay filtros de tags', async () => {
    // Arrange
    const fakeNotes = [
      { id: 1, title: 'Nota A', note_tags: [{ tags: { id: 1, name: 'importante' } }] },
      { id: 2, title: 'Nota B', note_tags: [] },
    ]
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeNotes, error: null }))

    // Act
    const result = await notesRepository.getFilteredNotes('u1', {})

    // Assert
    expect(result).toHaveLength(2)
  })

  it('filtra por tag_ids en JS después de la consulta a Supabase', async () => {
    // Arrange
    const fakeNotes = [
      { id: 1, title: 'Nota A', note_tags: [{ tags: { id: 1, name: 'importante' } }] },
      { id: 2, title: 'Nota B', note_tags: [{ tags: { id: 2, name: 'revisar' } }] },
    ]
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeNotes, error: null }))

    // Act — filtrar solo por tag id=1
    const result = await notesRepository.getFilteredNotes('u1', { tag_ids: [1] })

    // Assert — solo Nota A tiene el tag id=1
    expect(result).toHaveLength(1)
    // Assert — solo Nota A tiene el tag id=1
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Nota A')
  })

  it('lanza error si la consulta falla', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Falla DB filtros') }))

    // Act & Assert
    await expect(notesRepository.getFilteredNotes('u1', {})).rejects.toThrow('Falla DB filtros')
  })
})
