'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

export interface ChatUser {
  id: number; name: string; avatar: string | null; chatHandle: string | null
  role: string; lastSeen: string | null
}
export interface ChatParticipant { userId: number; status: string; user: ChatUser }
export interface ChatLastMessage {
  id: number; content: string | null; createdAt: string
  sender: { id: number; name: string }
  attachments: { id: number; fileName: string; fileType: string }[]
}
export interface ChatConversation {
  id: number; type: 'direct' | 'group'; name: string | null; avatarUrl: string | null
  participants: ChatParticipant[]; messages: ChatLastMessage[]
  unreadCount: number; updatedAt: string
}
export interface ChatAttachment {
  id: number; fileName: string; filePath: string; fileType: string; fileSize: number
}
export interface ChatReaction { emoji: string; user: { id: number; name: string } }
export interface ChatMessage {
  id: number; conversationId: number; content: string | null; createdAt: string
  deletedAt: string | null; pinned: boolean
  sender: { id: number; name: string; avatar: string | null; chatHandle: string | null }
  attachments: ChatAttachment[]
  reactions: ChatReaction[]
  readBy: { userId: number; readAt: string }[]
  replyTo: { id: number; content: string | null; deletedAt: string | null; sender: { id: number; name: string }; attachments: { id: number; fileName: string; fileType: string }[] } | null
}

export function useChatConversations(filter: 'all' | 'pending' | 'archived' = 'all') {
  const { data: session } = useSession()
  return useQuery<ChatConversation[]>({
    queryKey: ['chat-conversations', filter],
    queryFn: () => fetch(`/api/chat/conversations?filter=${filter}`).then(r => r.json()),
    refetchInterval: 8000,
    enabled: !!session,
    staleTime: 5000,
  })
}

export function useChatMessages(convId: number | null) {
  const { data: session } = useSession()
  return useQuery<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: number | null }>({
    queryKey: ['chat-messages', convId],
    queryFn: () => fetch(`/api/chat/conversations/${convId}/messages`).then(r => r.json()),
    refetchInterval: 5000,
    enabled: !!session && !!convId,
    staleTime: 3000,
  })
}

export function useSendMessage(convId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ content, files }: { content: string; files?: File[] }) => {
      const fd = new FormData()
      if (content.trim()) fd.append('content', content.trim())
      files?.forEach(f => fd.append('files', f))
      const r = await fetch(`/api/chat/conversations/${convId}/messages`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error('Error enviando mensaje')
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', convId] })
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })
}

export function useMarkRead(convId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => fetch(`/api/chat/conversations/${convId}/read`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-conversations'] }),
  })
}

export function useRespondRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ convId, userId, status }: { convId: number; userId: number; status: string }) =>
      fetch(`/api/chat/conversations/${convId}/participants/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-conversations'] }),
  })
}

export function useStartChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ targetUserId, firstMessage }: { targetUserId: number; firstMessage: string }) =>
      fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', targetUserId, firstMessage }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-conversations'] }),
  })
}

export function useSearchUsers(q: string) {
  return useQuery<ChatUser[]>({
    queryKey: ['chat-search', q],
    queryFn: () => fetch(`/api/chat/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
    enabled: q.length >= 2,
    staleTime: 10000,
  })
}

export function useChatTotalUnread() {
  const { data: session } = useSession()
  const { data: conversations = [] } = useQuery<ChatConversation[]>({
    queryKey: ['chat-conversations', 'all'],
    queryFn: () => fetch('/api/chat/conversations?filter=all').then(r => r.json()),
    refetchInterval: 10000,
    enabled: !!session,
    staleTime: 5000,
  })
  return conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)
}
