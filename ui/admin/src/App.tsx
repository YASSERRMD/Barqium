import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/Dashboard'
import { TenantsPage } from './pages/TenantsPage'
import { UpstreamsPage } from './pages/UpstreamsPage'
import { RoutesPage } from './pages/RoutesPage'
import { MetricsPage } from './pages/MetricsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="upstreams" element={<UpstreamsPage />} />
            <Route path="routes" element={<RoutesPage />} />
            <Route path="metrics" element={<MetricsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
