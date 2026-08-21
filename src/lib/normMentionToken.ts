// El chat interno guarda los mensajes como texto plano (sin pipeline de HTML/sanitización),
// así que una mención de norma se codifica como un token de texto simple —
// "@[Título](norma:id)" — y se resuelve a un link recién al renderizar.
const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(norma:(\d+)\)/g

export function buildMentionToken(norm: { id: number; title: string }): string {
  return `@[${norm.title}](norma:${norm.id})`
}

export type MentionTextPart = string | { type: 'mention'; id: string; label: string }

export function parseMentionText(text: string): MentionTextPart[] {
  const parts: MentionTextPart[] = []
  let lastIndex = 0
  for (const match of Array.from(text.matchAll(MENTION_TOKEN_RE))) {
    const [full, label, id] = match
    const index = match.index ?? 0
    if (index > lastIndex) parts.push(text.slice(lastIndex, index))
    parts.push({ type: 'mention', id, label })
    lastIndex = index + full.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

// Para previews de una sola línea (lista de conversaciones, cita de "responder a")
// donde no conviene/no se puede anidar un link clickeable.
export function stripMentionTokens(text: string): string {
  return text.replace(MENTION_TOKEN_RE, (_, label) => `@${label}`)
}
