import { describe, it, expect, vi, beforeEach } from 'vitest'

// Magic bytes reales de cada formato
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
const PNG_BYTES  = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PDF_BYTES  = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4
const MZ_BYTES   = Buffer.from([0x4d, 0x5a, 0x90, 0x00]) // EXE/DLL (MZ header)
const TEXT_BYTES = Buffer.from('Esto es un archivo de texto plano.', 'utf-8')
const BINARY_WITH_NULL = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64])

vi.mock('file-type', () => ({
  fromBuffer: vi.fn(),
}))

describe('getRealMime', () => {
  let fromBuffer: ReturnType<typeof vi.fn>
  let getRealMime: (buf: Buffer, declaredType?: string) => Promise<string | null>

  beforeEach(async () => {
    vi.resetModules()
    const ft = await import('file-type')
    fromBuffer = vi.mocked(ft.fromBuffer)
    const m = await import('@/lib/mime')
    getRealMime = m.getRealMime
  })

  it('detecta image/jpeg por magic bytes', async () => {
    fromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' })
    expect(await getRealMime(JPEG_BYTES)).toBe('image/jpeg')
    expect(fromBuffer).toHaveBeenCalledWith(JPEG_BYTES)
  })

  it('detecta image/png por magic bytes', async () => {
    fromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' })
    expect(await getRealMime(PNG_BYTES)).toBe('image/png')
  })

  it('detecta application/pdf por magic bytes', async () => {
    fromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' })
    expect(await getRealMime(PDF_BYTES)).toBe('application/pdf')
  })

  it('detecta el MIME real aunque el tipo declarado sea incorrecto', async () => {
    // Atacante renombra .exe a .jpg — file-type detecta el real
    fromBuffer.mockResolvedValue({ mime: 'application/x-msdownload', ext: 'exe' })
    const result = await getRealMime(MZ_BYTES, 'image/jpeg')
    expect(result).toBe('application/x-msdownload')
    // No está en ALLOWED_MIME → el route lo rechazará
  })

  it('devuelve null cuando file-type no reconoce el formato y no hay tipo declarado', async () => {
    fromBuffer.mockResolvedValue(undefined)
    expect(await getRealMime(Buffer.from([0x01, 0x02, 0x03]))).toBeNull()
  })

  it('acepta text/plain cuando no hay magic bytes y no tiene bytes nulos', async () => {
    fromBuffer.mockResolvedValue(undefined)
    expect(await getRealMime(TEXT_BYTES, 'text/plain')).toBe('text/plain')
  })

  it('rechaza "text/plain" cuando hay bytes nulos (binario disfrazado)', async () => {
    fromBuffer.mockResolvedValue(undefined)
    expect(await getRealMime(BINARY_WITH_NULL, 'text/plain')).toBeNull()
  })

  it('ignora el tipo declarado cuando file-type puede identificar el formato', async () => {
    fromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' })
    // Aunque se declare text/plain, la detección real gana
    expect(await getRealMime(PNG_BYTES, 'text/plain')).toBe('image/png')
  })

  it('devuelve null para tipo declarado no soportado cuando file-type no detecta nada', async () => {
    fromBuffer.mockResolvedValue(undefined)
    // declaredType desconocido (no text/plain) → no hay fallback
    expect(await getRealMime(Buffer.from([0xca, 0xfe]), 'application/octet-stream')).toBeNull()
  })
})
