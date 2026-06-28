'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Quote, Code } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}

const TOOLBAR_BTN = 'p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors'

export function RichTextEditor({ value, onChange, placeholder = 'Escribí aquí...', minHeight = '120px', className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange?.(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-3',
        style: `min-height: ${minHeight}`,
      },
    },
  })

  if (!editor) return null

  return (
    <div className={cn('border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-700', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-750">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(TOOLBAR_BTN, editor.isActive('bold') && 'bg-slate-200 dark:bg-slate-500')}><Bold size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(TOOLBAR_BTN, editor.isActive('italic') && 'bg-slate-200 dark:bg-slate-500')}><Italic size={14} /></button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(TOOLBAR_BTN, editor.isActive('bulletList') && 'bg-slate-200 dark:bg-slate-500')}><List size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(TOOLBAR_BTN, editor.isActive('orderedList') && 'bg-slate-200 dark:bg-slate-500')}><ListOrdered size={14} /></button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn(TOOLBAR_BTN, editor.isActive('blockquote') && 'bg-slate-200 dark:bg-slate-500')}><Quote size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={cn(TOOLBAR_BTN, editor.isActive('code') && 'bg-slate-200 dark:bg-slate-500')}><Code size={14} /></button>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
