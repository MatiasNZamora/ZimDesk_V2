import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Navigation mocks for component tests
vi.mock('next/navigation', () => ({
  useRouter:      () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams:      () => ({}),
}))

// next-auth client mocks
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut:    vi.fn(),
  signIn:     vi.fn(),
}))

// Suppress console.log/error in tests unless VITEST_VERBOSE is set
if (!process.env.VITEST_VERBOSE) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
}
