'use client'
import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  MessageSquare, X, ArrowLeft, Send, Plus, Search,
  Check, CheckCheck, Paperclip, Users, Image as ImageIcon,
  UserCheck, UserX, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useChatConversations, useChatMessages, useSendMessage, useMarkRead,
  useRespondRequest, useStartChat, useSearchUsers,
  ChatConversation, ChatMessage,
} from '@/hooks/useChat'

type View = 'list' | 'conversation' | 'new-chat'

function Avatar({ name, src, size = 9 }: { name: string; src?: string | null; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-semibold text-sm`
  return (
    <div className={cls}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
    </div>
  )
}

function formatShort(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function ReadReceipts({ msg, convType, totalActive, myId }: { msg: ChatMessage; convType: string; totalActive: number; myId: number }) {
  if (msg.sender.id !== myId) return null
  const readByOthers = msg.readBy.filter(r => r.userId !== myId)
  const allRead = readByOthers.length >= totalActive - 1
  if (allRead) return <CheckCheck size={13} className="text-indigo-300 shrink-0" />
  if (readByOthers.length > 0) return <CheckCheck size={13} className="text-slate-300 shrink-0" />
  return <Check size={13} className="text-slate-300 shrink-0" />
}

function FileAttachment({ att }: { att: { fileName: string; filePath: string; fileType: string; fileSize: number } }) {
  const isImage = att.fileType.startsWith('image/')
  if (isImage) {
    return (
      <a href={att.filePath} target="_blank" rel="noreferrer" className="block mt-1 max-w-[180px] rounded-lg overflow-hidden border border-white/20">
        <img src={att.filePath} alt={att.fileName} className="max-w-full object-cover" />
      </a>
    )
  }
  return (
    <a href={att.filePath} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs max-w-[200px] truncate">
      <FileText size={14} className="shrink-0" />
      <span className="truncate">{att.fileName}</span>
    </a>
  )
}

// ===========================================================================
// ConversationList
// ===========================================================================
function ConversationList({
  onSelect, onNewChat,
}: { onSelect: (id: number) => void; onNewChat: () => void }) {
  const { data: session } = useSession()
  const myId = Number(session?.user?.id)
  const [tab, setTab] = useState<'all' | 'pending'>('all')
  const { data: conversations = [], isLoading } = useChatConversations(tab)

  function getDisplay(conv: ChatConversation) {
    if (conv.type === 'group') return { name: conv.name ?? 'Grupo', avatar: conv.avatarUrl, handle: null }
    const other = conv.participants.find(p => p.userId !== myId)?.user
    return { name: other?.name ?? '?', avatar: other?.avatar, handle: other?.chatHandle }
  }

  const pendingCount = conversations.filter(c =>
    c.participants.some(p => p.userId === myId && p.status === 'pending')
  ).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Mensajes</h3>
        <button onClick={onNewChat}
          className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors"
          title="Nuevo chat">
          <Plus size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-2 shrink-0">
        {(['all', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('text-xs px-3 py-1 rounded-full font-medium transition-colors',
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700')}>
            {t === 'all' ? 'Todos' : (
              <span className="flex items-center gap-1">
                Solicitudes
                {pendingCount > 0 && <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{pendingCount}</span>}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-20 text-slate-400 text-xs">Cargando...</div>
        )}
        {!isLoading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
            <MessageSquare size={28} className="opacity-30" />
            {tab === 'pending' ? 'Sin solicitudes pendientes' : 'Sin conversaciones. ¡Iniciá un chat!'}
          </div>
        )}
        {conversations.map(conv => {
          const { name, avatar, handle } = getDisplay(conv)
          const lastMsg = conv.messages[0]
          const isPending = conv.participants.some(p => p.userId === myId && p.status === 'pending')
          return (
            <button key={conv.id} onClick={() => onSelect(conv.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
              <div className="relative shrink-0">
                <Avatar name={name} src={avatar} size={10} />
                {conv.type === 'group' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Users size={9} className="text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{name}</span>
                  {lastMsg && <span className="text-[10px] text-slate-400 shrink-0">{formatShort(lastMsg.createdAt)}</span>}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {isPending ? (
                      <span className="text-indigo-500 font-medium">Solicitud pendiente</span>
                    ) : lastMsg ? (
                      lastMsg.content ?? `📎 ${lastMsg.attachments[0]?.fileName ?? 'Archivo'}`
                    ) : 'Sin mensajes'}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ===========================================================================
// NewChatView
// ===========================================================================
function NewChatView({ onBack, onStarted }: { onBack: () => void; onStarted: (convId: number) => void }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<{ id: number; name: string; chatHandle: string | null; avatar: string | null } | null>(null)
  const [msg, setMsg] = useState('')
  const { data: results = [], isLoading } = useSearchUsers(q)
  const startChat = useStartChat()

  async function handleStart() {
    if (!selected || !msg.trim()) return
    const res = await startChat.mutateAsync({ targetUserId: selected.id, firstMessage: msg.trim() })
    if (res.conversationId) onStarted(res.conversationId)
    else if (res.error === 'Ya existe una conversación con este usuario' && res.conversationId) {
      onStarted(res.conversationId)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft size={16} className="text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nuevo chat</span>
      </div>

      {!selected ? (
        <>
          <div className="px-4 py-2 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por @handle o nombre..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {q.length >= 2 && isLoading && (
              <div className="text-xs text-slate-400 text-center py-4">Buscando...</div>
            )}
            {q.length >= 2 && !isLoading && results.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-4">Sin resultados</div>
            )}
            {results.map(u => (
              <button key={u.id} onClick={() => setSelected(u)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                <Avatar name={u.name} src={u.avatar} size={9} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.name}</p>
                  {u.chatHandle && <p className="text-xs text-slate-400">@{u.chatHandle}</p>}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col flex-1 p-4 gap-3">
          <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <Avatar name={selected.name} src={selected.avatar} size={9} />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{selected.name}</p>
              {selected.chatHandle && <p className="text-xs text-indigo-500">@{selected.chatHandle}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="ml-auto p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg">
              <X size={14} className="text-slate-400" />
            </button>
          </div>
          <textarea
            value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="Escribí tu primer mensaje..."
            rows={4}
            className="w-full p-3 text-sm bg-slate-100 dark:bg-slate-700 rounded-xl border-0 outline-none resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
          <button
            onClick={handleStart}
            disabled={!msg.trim() || startChat.isPending}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
            <Send size={14} />
            {startChat.isPending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// ConversationView
// ===========================================================================
function ConversationView({ convId, onBack }: { convId: number; onBack: () => void }) {
  const { data: session } = useSession()
  const myId = Number(session?.user?.id)
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: conversations = [] } = useChatConversations()
  const conv = conversations.find(c => c.id === convId)
  const { data: msgData } = useChatMessages(convId)
  const messages = msgData?.messages ?? []
  const sendMsg = useSendMessage(convId)
  const markRead = useMarkRead(convId)
  const respondRequest = useRespondRequest()

  const meParticipant = conv?.participants.find(p => p.userId === myId)
  const isPending = meParticipant?.status === 'pending'
  const activeParticipants = conv?.participants.filter(p => p.status === 'active') ?? []

  useEffect(() => {
    markRead.mutate()
  }, [convId]) // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function getConvDisplay() {
    if (!conv) return { name: '...', avatar: null }
    if (conv.type === 'group') return { name: conv.name ?? 'Grupo', avatar: conv.avatarUrl }
    const other = conv.participants.find(p => p.userId !== myId)?.user
    return { name: other?.name ?? '?', avatar: other?.avatar ?? null }
  }

  const { name: convName, avatar: convAvatar } = getConvDisplay()

  async function handleSend() {
    if ((!input.trim() && files.length === 0) || isPending) return
    await sendMsg.mutateAsync({ content: input, files })
    setInput('')
    setFiles([])
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, 5)
    setFiles(prev => [...prev, ...picked].slice(0, 5))
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft size={16} className="text-slate-500" />
        </button>
        <Avatar name={convName} src={convAvatar} size={8} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{convName}</p>
          {conv?.type === 'group' && (
            <p className="text-[10px] text-slate-400">{activeParticipants.length} miembros</p>
          )}
        </div>
      </div>

      {/* Pending request banner */}
      {isPending && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 shrink-0">
          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-2">Solicitud de chat pendiente</p>
          <div className="flex gap-2">
            <button
              onClick={() => respondRequest.mutate({ convId, userId: myId, status: 'active' })}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
              <UserCheck size={13} /> Aceptar
            </button>
            <button
              onClick={() => { respondRequest.mutate({ convId, userId: myId, status: 'declined' }); onBack() }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors">
              <UserX size={13} /> Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">Sin mensajes aún</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender.id === myId
          const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender.id !== msg.sender.id)
          const showName = !isMe && conv?.type === 'group' && showAvatar
          const deleted = !!msg.deletedAt

          // Group reactions by emoji
          const reactionGroups: Record<string, { count: number; me: boolean }> = {}
          msg.reactions.forEach(r => {
            if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, me: false }
            reactionGroups[r.emoji].count++
            if (r.user.id === myId) reactionGroups[r.emoji].me = true
          })

          return (
            <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
              {!isMe && (
                <div className="w-7 shrink-0 mt-auto">
                  {showAvatar && <Avatar name={msg.sender.name} src={msg.sender.avatar} size={7} />}
                </div>
              )}
              <div className={cn('max-w-[75%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                {showName && (
                  <span className="text-[10px] text-slate-400 mb-0.5 ml-1">{msg.sender.name}</span>
                )}
                {/* Reply to */}
                {msg.replyTo && !deleted && (
                  <div className={cn('text-[10px] px-2 py-1 rounded-t-lg mb-0 opacity-70 max-w-full truncate',
                    isMe ? 'bg-indigo-400 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300')}>
                    ↩ {msg.replyTo.content ?? '📎 Archivo'}
                  </div>
                )}
                {/* Bubble */}
                <div className={cn('px-3 py-2 rounded-2xl text-sm break-words',
                  isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-sm',
                  msg.replyTo && !deleted && (isMe ? 'rounded-tr-none' : 'rounded-tl-none'))}>
                  {deleted ? (
                    <span className="italic opacity-60 text-xs">Mensaje eliminado</span>
                  ) : (
                    <>
                      {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                      {msg.attachments.map(a => <FileAttachment key={a.id} att={a} />)}
                    </>
                  )}
                </div>
                {/* Footer: time + read receipts */}
                <div className={cn('flex items-center gap-1 mt-0.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                  <span className="text-[10px] text-slate-400">{formatShort(msg.createdAt)}</span>
                  {isMe && !deleted && (
                    <ReadReceipts msg={msg} convType={conv?.type ?? 'direct'} totalActive={activeParticipants.length} myId={myId} />
                  )}
                </div>
                {/* Reactions */}
                {Object.keys(reactionGroups).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(reactionGroups).map(([emoji, { count, me }]) => (
                      <span key={emoji} className={cn('text-xs px-1.5 py-0.5 rounded-full border',
                        me ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600')}>
                        {emoji} {count > 1 && count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 shrink-0">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300">
              {f.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
              <span className="max-w-[100px] truncate">{f.name}</span>
              <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}><X size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 flex items-end gap-2 shrink-0">
        <button onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0">
          <Paperclip size={16} />
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isPending}
          placeholder={isPending ? 'Aceptá la solicitud para chatear' : 'Mensaje...'}
          rows={1}
          className="flex-1 resize-none text-sm bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2 border-0 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 max-h-24 overflow-y-auto disabled:opacity-50"
          style={{ lineHeight: '1.4' }}
        />
        <button
          onClick={handleSend}
          disabled={(!input.trim() && files.length === 0) || isPending || sendMsg.isPending}
          className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ===========================================================================
// Main ChatBubble
// ===========================================================================
export function ChatBubble({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [view, setView] = useState<View>('list')
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const { data: conversations = [] } = useChatConversations()
  const { data: session } = useSession()
  const myId = Number(session?.user?.id)

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)

  function openConv(id: number) {
    setActiveConvId(id)
    setView('conversation')
  }

  function goBack() {
    setView('list')
    setActiveConvId(null)
  }

  function handleToggle() {
    if (!open) setView('list')
    onToggle()
  }

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Panel */}
        {open && (
          <div
            className="w-[370px] h-[520px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
            style={{ animation: 'chatSlideUp 0.2s ease-out' }}
          >
            {/* Close row */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Chat</span>
              <button onClick={handleToggle}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* View content */}
            <div className="flex-1 min-h-0">
              {view === 'list' && (
                <ConversationList
                  onSelect={openConv}
                  onNewChat={() => setView('new-chat')}
                />
              )}
              {view === 'new-chat' && (
                <NewChatView
                  onBack={goBack}
                  onStarted={(convId) => { openConv(convId) }}
                />
              )}
              {view === 'conversation' && activeConvId !== null && (
                <ConversationView convId={activeConvId} onBack={goBack} />
              )}
            </div>
          </div>
        )}

        {/* Bubble button */}
        <button
          onClick={handleToggle}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center relative"
          title="Chat interno"
        >
          {open ? <X size={22} /> : <MessageSquare size={22} />}
          {!open && totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-900">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  )
}
