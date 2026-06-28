'use client'
import { isRichText } from '@/lib/sanitize'
import DOMPurify from 'dompurify'

interface Props {
  content: string
  className?: string
}

export function RichTextDisplay({ content, className = '' }: Props) {
  if (!isRichText(content)) {
    return (
      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${className}`}>
        {content}
      </div>
    )
  }

  // Sanitize client-side before rendering
  const clean = typeof window !== 'undefined'
    ? DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      })
    : content

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
