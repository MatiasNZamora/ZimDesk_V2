import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface AppConfig {
  app_name: string
  logo_url: string
  favicon_url: string
  accent_color: string
  support_email: string
  footer_text: string
  max_attach_mb: string
  tickets_per_page: string
  allow_client_create: string
}

export function useAppConfig() {
  return useQuery<AppConfig>({
    queryKey: ['app-config'],
    queryFn: () => axios.get('/api/config').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
}
