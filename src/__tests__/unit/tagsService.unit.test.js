import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repository/tagsRepository.js', () => ({
  default: {
    getTagsByStudentId: vi.fn(),
    getTagById: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  }
}))

import tagsRepository from '../../repository/tagsRepository.js'
import tagsService from '../../service/tagsService.js'

beforeEach(() => vi.clearAllMocks())

// ─── createTag ───────────────────────────────────────────────────────────────

describe('tagsService — createTag', () => {
  it('lanza ValidationError cuando el nombre está vacío', async () => {
    const err = await tagsService.createTag({ name: '' }, 'u1').catch(e => e)
    expect(err.name).toBe('ValidationError')
    expect(err.message).toMatch(/nombre/)
  })

  it('lanza ValidationError cuando el nombre es solo espacios', async () => {
    const err = await tagsService.createTag({ name: '   ' }, 'u1').catch(e => e)
    expect(err.name).toBe('ValidationError')
  })

  it('trimea el nombre e inyecta student_id antes de guardar', async () => {
    // Arrange
    tagsRepository.createTag.mockResolvedValue({ id: 't1', name: 'Exámenes', student_id: 'u1' })
    // Act
    const result = await tagsService.createTag({ name: '  Exámenes  ', color_hex: '#FF0' }, 'u1')
    // Assert
    expect(tagsRepository.createTag).toHaveBeenCalledWith({
      name: 'Exámenes', color_hex: '#FF0', student_id: 'u1'
    })
    expect(result.id).toBe('t1')
  })

  it('usa color_hex null cuando no se proporciona', async () => {
    tagsRepository.createTag.mockResolvedValue({ id: 't1' })
    await tagsService.createTag({ name: 'Tag' }, 'u1')
    expect(tagsRepository.createTag).toHaveBeenCalledWith(
      expect.objectContaining({ color_hex: null })
    )
  })
})

// ─── updateTag ───────────────────────────────────────────────────────────────

describe('tagsService — updateTag', () => {
  it('lanza ValidationError cuando el nombre está vacío', async () => {
    const err = await tagsService.updateTag('t1', { name: '' }, 'u1').catch(e => e)
    expect(err.name).toBe('ValidationError')
  })

  it('lanza 404 cuando la etiqueta no existe', async () => {
    tagsRepository.getTagById.mockResolvedValue(null)
    const err = await tagsService.updateTag('t1', { name: 'X' }, 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('lanza 403 cuando la etiqueta no pertenece al usuario', async () => {
    tagsRepository.getTagById.mockResolvedValue({ id: 't1', student_id: 'otro' })
    const err = await tagsService.updateTag('t1', { name: 'X' }, 'u1').catch(e => e)
    expect(err.status).toBe(403)
  })

  it('actualiza la etiqueta cuando el usuario es dueño', async () => {
    // Arrange
    tagsRepository.getTagById.mockResolvedValue({ id: 't1', student_id: 'u1' })
    tagsRepository.updateTag.mockResolvedValue({ id: 't1', name: 'Nuevo' })
    // Act
    const result = await tagsService.updateTag('t1', { name: '  Nuevo  ', color_hex: '#000' }, 'u1')
    // Assert
    expect(tagsRepository.updateTag).toHaveBeenCalledWith('t1', { name: 'Nuevo', color_hex: '#000' })
    expect(result.name).toBe('Nuevo')
  })
})

// ─── deleteTag ────────────────────────────────────────────────────────────────

describe('tagsService — deleteTag', () => {
  it('lanza 404 cuando la etiqueta no existe', async () => {
    tagsRepository.getTagById.mockResolvedValue(null)
    const err = await tagsService.deleteTag('t1', 'u1').catch(e => e)
    expect(err.status).toBe(404)
  })

  it('lanza 403 cuando la etiqueta no pertenece al usuario', async () => {
    tagsRepository.getTagById.mockResolvedValue({ id: 't1', student_id: 'otro' })
    const err = await tagsService.deleteTag('t1', 'u1').catch(e => e)
    expect(err.status).toBe(403)
  })

  it('elimina la etiqueta cuando el usuario es dueño', async () => {
    tagsRepository.getTagById.mockResolvedValue({ id: 't1', student_id: 'u1' })
    tagsRepository.deleteTag.mockResolvedValue(undefined)
    await tagsService.deleteTag('t1', 'u1')
    expect(tagsRepository.deleteTag).toHaveBeenCalledWith('t1')
  })
})
