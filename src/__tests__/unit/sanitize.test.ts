import { describe, it, expect } from 'vitest'
import { sanitizeMessage, isRichText } from '@/lib/sanitize'

describe('sanitizeMessage — XSS prevention', () => {
  it('strips <script> tags and their content', () => {
    const input = '<p>Hola</p><script>alert("xss")</script>'
    const result = sanitizeMessage(input)
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
    expect(result).toContain('<p>Hola</p>')
  })

  it('strips inline event handlers from allowed elements', () => {
    expect(sanitizeMessage('<p onmouseover="alert(1)">texto</p>')).not.toContain('onmouseover')
    expect(sanitizeMessage('<a href="x" onclick="evil()">link</a>')).not.toContain('onclick')
  })

  it('strips <img> with onerror (classic XSS vector)', () => {
    const result = sanitizeMessage('<img src="x" onerror="alert(1)">')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('onerror')
  })

  it('strips javascript: URIs from anchor tags', () => {
    const result = sanitizeMessage('<a href="javascript:alert(1)">click</a>')
    expect(result).not.toContain('javascript:')
  })

  it('strips <iframe> tags', () => {
    const result = sanitizeMessage('<iframe src="https://evil.com"></iframe>')
    expect(result).not.toContain('<iframe')
  })

  it('strips <style> injection', () => {
    const result = sanitizeMessage('<style>body{display:none}</style>contenido')
    expect(result).not.toContain('<style')
    expect(result).toContain('contenido')
  })

  it('preserves allowed inline tags: strong, em, u, code', () => {
    const input = '<p><strong>negrita</strong> <em>cursiva</em> <u>subrayado</u> <code>código</code></p>'
    const result = sanitizeMessage(input)
    expect(result).toContain('<strong>negrita</strong>')
    expect(result).toContain('<em>cursiva</em>')
    expect(result).toContain('<u>subrayado</u>')
    expect(result).toContain('<code>código</code>')
  })

  it('preserves list elements: ul, ol, li', () => {
    const input = '<ul><li>item 1</li><li>item 2</li></ul>'
    const result = sanitizeMessage(input)
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>item 1</li>')
  })

  it('preserves <pre><code> blocks for code snippets', () => {
    const input = '<pre><code>const x = 1\nreturn x</code></pre>'
    const result = sanitizeMessage(input)
    expect(result).toContain('<pre>')
    expect(result).toContain('<code>')
  })

  it('preserves <blockquote> for quotes', () => {
    const result = sanitizeMessage('<blockquote>texto citado</blockquote>')
    expect(result).toContain('<blockquote>')
  })

  it('adds target="_blank" and rel="noopener noreferrer" to links', () => {
    const result = sanitizeMessage('<a href="https://example.com">link seguro</a>')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
    expect(result).toContain('href="https://example.com"')
  })

  it('strips data: URIs in anchor tags', () => {
    const result = sanitizeMessage('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(result).not.toContain('data:')
  })

  it('handles plain text unchanged', () => {
    expect(sanitizeMessage('texto plano sin HTML')).toBe('texto plano sin HTML')
  })

  it('handles empty string', () => {
    expect(sanitizeMessage('')).toBe('')
  })

  it('handles deeply nested XSS attempts', () => {
    const result = sanitizeMessage('<div><p><span onload="evil()">texto</span></p></div>')
    expect(result).not.toContain('onload')
    expect(result).not.toContain('evil')
  })
})

describe('isRichText', () => {
  it('returns true when content starts with an HTML tag', () => {
    expect(isRichText('<p>párrafo</p>')).toBe(true)
    expect(isRichText('<strong>negrita</strong>')).toBe(true)
    expect(isRichText('<ul><li>item</li></ul>')).toBe(true)
  })

  it('returns false for plain text content', () => {
    expect(isRichText('texto plano')).toBe(false)
    expect(isRichText('sin etiquetas HTML')).toBe(false)
    expect(isRichText('')).toBe(false)
  })

  it('ignores leading whitespace when checking for HTML', () => {
    expect(isRichText('   <p>con espacios antes</p>')).toBe(true)
    expect(isRichText('\n<ul><li>item</li></ul>')).toBe(true)
  })
})
