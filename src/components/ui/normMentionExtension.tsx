import axios from 'axios'
import Mention from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import { NormMentionList } from '@/components/ui/NormMentionList'

type NormItem = { id: number; title: string }

// Cacheada a nivel módulo: la lista de normas rara vez cambia durante una sesión
// de composición, y evita golpear la API en cada tecla dentro del popup de @.
let normsPromise: Promise<NormItem[]> | null = null
function fetchNorms(): Promise<NormItem[]> {
  if (!normsPromise) {
    normsPromise = axios.get('/api/platform-norms')
      .then(r => r.data as NormItem[])
      .catch(() => { normsPromise = null; return [] })
  }
  return normsPromise
}

export const NormMention = Mention.configure({
  HTMLAttributes: { class: 'norm-mention' },
  renderHTML({ node }) {
    const label = node.attrs.label ?? node.attrs.id
    return ['a', { href: `/platform-norms?open=${node.attrs.id}`, target: '_blank', rel: 'noopener noreferrer' }, `@${label}`]
  },
  renderText({ node }) {
    return `@${node.attrs.label ?? node.attrs.id}`
  },
  suggestion: {
    char: '@',
    items: async ({ query }) => {
      const norms = await fetchNorms()
      return norms
        .filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    },
    render: () => {
      let component: ReactRenderer
      let unmount: (() => void) | undefined

      return {
        onStart: props => {
          component = new ReactRenderer(NormMentionList, { props, editor: props.editor })
          unmount = props.mount(component.element)
        },
        onUpdate: props => {
          component.updateProps(props)
        },
        onKeyDown: props => {
          if (props.event.key === 'Escape') {
            unmount?.()
            return true
          }
          return (component.ref as { onKeyDown: (p: typeof props) => boolean } | null)?.onKeyDown(props) ?? false
        },
        onExit: () => {
          unmount?.()
          component.destroy()
        },
      }
    },
  },
})
