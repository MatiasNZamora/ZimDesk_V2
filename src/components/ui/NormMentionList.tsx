'use client'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { FileText } from 'lucide-react'

type NormItem = { id: number; title: string }

interface Props {
  items: NormItem[]
  command: (item: { id: string; label: string }) => void
}

export const NormMentionList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [props.items])

    const selectItem = (index: number) => {
      const item = props.items[index]
      if (item) props.command({ id: String(item.id), label: item.title })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (props.items.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % props.items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }), [selectedIndex, props.items]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto min-w-[220px]">
        {props.items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-400">Sin normas que coincidan</p>
        ) : (
          props.items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(index)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm truncate transition-colors ${
                index === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText size={13} className="shrink-0 text-slate-400" />
              <span className="truncate">{item.title}</span>
            </button>
          ))
        )}
      </div>
    )
  }
)
NormMentionList.displayName = 'NormMentionList'
