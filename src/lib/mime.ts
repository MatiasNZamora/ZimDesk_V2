import { fromBuffer } from 'file-type'

// MIME types que file-type no puede detectar (son texto plano sin magic bytes)
const TEXT_ONLY_MIMES = new Set(['text/plain'])

/**
 * Detecta el MIME real de un buffer leyendo sus magic bytes.
 * Para texto plano (sin magic bytes), verifica ausencia de bytes nulos.
 * `declaredType` se usa como pista solo para el caso text/plain.
 * Retorna null si el tipo no pudo determinarse.
 */
export async function getRealMime(buffer: Buffer, declaredType?: string): Promise<string | null> {
  const detected = await fromBuffer(buffer)
  if (detected) return detected.mime

  if (declaredType && TEXT_ONLY_MIMES.has(declaredType)) {
    return buffer.includes(0x00) ? null : 'text/plain'
  }

  return null
}
