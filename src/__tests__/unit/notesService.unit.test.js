import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repository/notesRepository.js', () => ({
  default: {
    getNotesBySubject: vi.fn(),
    getNoteById: vi.fn(),
    checkSubjectOwnership: vi.fn(),
    checkNoteOwnership: vi.fn(),
    createNote: vi.fn(),
    linkTagsToNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNoteTags: vi.fn(),
    deleteNote: vi.fn(),
    getMaterialsByNoteId: vi.fn(),
    getNoteContentsBySubject: vi.fn(),
    getFilteredNotes: vi.fn(),
  }
}))

vi.mock('../../repository/storageRepository.js', () => ({
  default: {
    createSignedUrl: vi.fn(),
    deleteFiles: vi.fn(),
  }
}))

import notesRepository from '../../repository/notesRepository.js'
import storageRepository from '../../repository/storageRepository.js'
import notesService from '../../service/notesService.js'

beforeEach(() => vi.clearAllMocks())

// ─── createNote ──────────────────────────────────────────────────────────────

describe('notesService — createNote', () => {
  it('lanza ValidationError cuando falta subject_id', async () => {
    const err = await notesService.createNote({ title: 'Mi nota' }, 'u1').catch(e => e)
    expect(err.name).toBe('ValidationError')
    expect(err.message).toMatch(/subject_id/)
  })

  it('lanza ValidationError cuando falta title', async () => {
    const err = await notesService.createNote({ subject_id: 'sub1' }, 'u1').catch(e => e)
    expect(err.name).toBe('ValidationError')
    expect(err.message).toMatch(/title/)
  })

  it('lanza 403 cuando la asignatura no pertenece al usuario', async () => {
    notesRepository.checkSubjectOwnership.mockResolvedValue(null)
    const err = await notesService
      .createNote({ subject_id: 'sub1', title: 'Mi nota' }, 'u1')
      .catch(e => e)
    expect(err.status).toBe(403)
  })

  it('crea la nota sin tags cuando tag_ids está vacío', async () => {
    // Arrange
    notesRepository.checkSubjectOwnership.mockResolvedValue({ id: 'sub1' })
    notesRepository.createNote.mockResolvedValue({ id: 'n1' })
    notesRepository.getNoteById.mockResolvedValue({ id: 'n1', title: 'Mi nota', tags: [] })
    // Act
    const result = await notesService.createNote({ subject_id: 'sub1', title: 'Mi nota' }, 'u1')
    // Assert
    expect(notesRepository.linkTagsToNote).not.toHaveBeenCalled()
    expect(result.id).toBe('n1')
  })

  it('enlaza tags cuando se proporcionan tag_ids', async () => {
    // Arrange
    notesRepository.checkSubjectOwnership.mockResolvedValue({ id: 'sub1' })
    notesRepository.createNote.mockResolvedValue({ id: 'n1' })
    notesRepository.getNoteById.mockResolvedValue({ id: 'n1', tags: [{ id: 't1' }] })
    // Act
    await notesService.createNote({ subject_id: 'sub1', title: 'Mi nota', tag_ids: ['t1'] }, 'u1')
    // Assert
    expect(notesRepository.linkTagsToNote).toHaveBeenCalledWith('n1', ['t1'])
  })
})

// ─── getNoteById ─────────────────────────────────────────────────────────────

describe('notesService — getNoteById', () => {
  it('lanza 404 cuando la nota no pertenece al usuario', async () => {
    notesRepository.checkNoteOwnership.mockResolvedValue(null)
    const err = await notesService.getNoteById('n1', 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('genera signed URLs para materiales con bucket_url', async () => {
    // Arrange
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    notesRepository.getNoteById.mockResolvedValue({
      id: 'n1',
      material: [
        { id: 'm1', bucket_url: 'users/u1/n1/doc.pdf' },
        { id: 'm2', bucket_url: null }
      ]
    })
    storageRepository.createSignedUrl.mockResolvedValue('https://signed.url/doc.pdf')
    // Act
    const result = await notesService.getNoteById('n1', 'u1')
    // Assert — solo se llama para el material con bucket_url
    expect(storageRepository.createSignedUrl).toHaveBeenCalledTimes(1)
    expect(result.material[0].signed_url).toBe('https://signed.url/doc.pdf')
    expect(result.material[1].signed_url).toBeUndefined()
  })
})

// ─── updateNote ──────────────────────────────────────────────────────────────

describe('notesService — updateNote', () => {
  it('lanza 404 cuando la nota no pertenece al usuario', async () => {
    notesRepository.checkNoteOwnership.mockResolvedValue(null)
    const err = await notesService.updateNote('n1', { title: 'nuevo' }, 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('filtra campos no permitidos y actualiza solo los válidos', async () => {
    // Arrange
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    notesRepository.updateNote.mockResolvedValue(undefined)
    notesRepository.getNoteById.mockResolvedValue({ id: 'n1', title: 'Actualizado' })
    // Act
    await notesService.updateNote('n1', { title: 'Actualizado', campo_hack: 'evil' }, 'u1')
    // Assert
    expect(notesRepository.updateNote).toHaveBeenCalledWith('n1', { title: 'Actualizado' })
  })

  it('reemplaza tags cuando se envía tag_ids', async () => {
    // Arrange
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    notesRepository.updateNote.mockResolvedValue(undefined)
    notesRepository.getNoteById.mockResolvedValue({ id: 'n1' })
    // Act
    await notesService.updateNote('n1', { tag_ids: ['t2', 't3'] }, 'u1')
    // Assert
    expect(notesRepository.deleteNoteTags).toHaveBeenCalledWith('n1')
    expect(notesRepository.linkTagsToNote).toHaveBeenCalledWith('n1', ['t2', 't3'])
  })

  it('elimina todos los tags cuando se envía tag_ids vacío', async () => {
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    notesRepository.getNoteById.mockResolvedValue({ id: 'n1' })
    await notesService.updateNote('n1', { tag_ids: [] }, 'u1')
    expect(notesRepository.deleteNoteTags).toHaveBeenCalledWith('n1')
    expect(notesRepository.linkTagsToNote).not.toHaveBeenCalled()
  })
})

// ─── deleteNote ──────────────────────────────────────────────────────────────

describe('notesService — deleteNote', () => {
  it('lanza 404 cuando la nota no pertenece al usuario', async () => {
    notesRepository.checkNoteOwnership.mockResolvedValue(null)
    const err = await notesService.deleteNote('n1', 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('elimina archivos de Storage antes de borrar la nota', async () => {
    // Arrange
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    notesRepository.getMaterialsByNoteId.mockResolvedValue([
      { bucket_url: 'u1/n1/file1.pdf' },
      { bucket_url: 'u1/n1/file2.pdf' }
    ])
    notesRepository.deleteNote.mockResolvedValue(undefined)
    // Act
    await notesService.deleteNote('n1', 'u1')
    // Assert
    expect(storageRepository.deleteFiles).toHaveBeenCalledWith(['u1/n1/file1.pdf', 'u1/n1/file2.pdf'])
    expect(notesRepository.deleteNote).toHaveBeenCalledWith('n1')
  })

  it('no llama a Storage cuando la nota no tiene materiales', async () => {
    notesRepository.checkNoteOwnership.mockResolvedValue({ id: 'n1' })
    notesRepository.getMaterialsByNoteId.mockResolvedValue([])
    notesRepository.deleteNote.mockResolvedValue(undefined)
    await notesService.deleteNote('n1', 'u1')
    expect(storageRepository.deleteFiles).not.toHaveBeenCalled()
  })
})

// ─── getNoteContentsForSummary ────────────────────────────────────────────────

describe('notesService — getNoteContentsForSummary', () => {
  it('filtra notas sin contenido útil para la IA', async () => {
    // Arrange
    notesRepository.checkSubjectOwnership.mockResolvedValue({ id: 'sub1' })
    notesRepository.getNoteContentsBySubject.mockResolvedValue([
      { id: 'n1', content_text: 'Texto útil' },
      { id: 'n2', content_text: '' },
      { id: 'n3', content_text: '   ' },
    ])
    // Act
    const result = await notesService.getNoteContentsForSummary('sub1', 'u1')
    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('n1')
  })
})
