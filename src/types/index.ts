import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      avatar: string | null
      departmentId: number
      departmentName: string
    } & DefaultSession['user']
  }
}

export type Role = 'admin' | 'agent' | 'client'

export interface UserSession {
  id: string
  name: string
  email: string
  role: Role
  avatar: string | null
  departmentId: number
  departmentName: string
}

export interface TicketWithRelations {
  id: number
  subject: string
  description: string
  statusId: number
  priorityId: number
  categoryId: number
  userId: number
  assignedTo: number | null
  closedAt: Date | null
  firstResponseAt: Date | null
  slaAlertedAt: Date | null
  createdAt: Date
  updatedAt: Date
  creator: { id: number; name: string; email: string; department: { name: string } }
  agent: { id: number; name: string; email: string } | null
  status: { id: number; name: string; slug: string }
  priority: { id: number; name: string; color: string; slug: string }
  category: { id: number; name: string }
  messages?: MessageWithRelations[]
  attachments?: AttachmentTicket[]
  logs?: LogWithUser[]
  _count?: { messages: number }
}

export interface MessageWithRelations {
  id: number
  ticketId: number
  userId: number
  message: string
  createdAt: Date
  user: { id: number; name: string; role: string; avatar: string | null }
  attachments: AttachmentMessage[]
}

export interface AttachmentTicket {
  id: number
  ticketId: number
  filePath: string
  fileType: string
  fileName: string
  fileSize: number
}

export interface AttachmentMessage {
  id: number
  ticketMessageId: number
  filePath: string
  fileType: string
  fileName: string
  fileSize: number
}

export interface LogWithUser {
  id: number
  ticketId: number
  userId: number
  action: string
  createdAt: Date
  user: { name: string }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
