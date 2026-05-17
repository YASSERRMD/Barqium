import { Component, type ErrorInfo, type ReactNode } from 'react'
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

interface ErrorBoundaryState {
  error: Error | null
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-navy mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-4">{this.state.error.message}</p>
            <button
              className="text-sm text-navy underline"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  return (
    <AppErrorBoundary>
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
    </AppErrorBoundary>
  )
}
