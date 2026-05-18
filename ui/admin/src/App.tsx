import { Component, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/Dashboard'
import { TenantsPage } from './pages/TenantsPage'
import { UpstreamsPage } from './pages/UpstreamsPage'
import { RoutesPage } from './pages/RoutesPage'
import { MetricsPage } from './pages/MetricsPage'
import { AIProvidersPage } from './pages/AIProvidersPage'
import { RateLimitsPage } from './pages/RateLimitsPage'
import { WasmPluginsPage } from './pages/WasmPluginsPage'
import { ConsumersPage } from './pages/ConsumersPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { RegionsPage } from './pages/RegionsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

interface ErrorBoundaryState { error: Error | null }

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
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-xl">!</span>
            </div>
            <h1 className="text-lg font-bold text-navy dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-5 font-code">{this.state.error.message}</p>
            <button
              className="btn-primary"
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

/* Stub pages for routes not yet implemented */
function StubPage({ name }: { name: string }) {
  return (
    <div className="p-8">
      <h1 className="page-title">{name}</h1>
      <p className="page-sub mt-2">This page is coming in a future phase.</p>
    </div>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="tenants"      element={<TenantsPage />} />
                  <Route path="upstreams"    element={<UpstreamsPage />} />
                  <Route path="routes"       element={<RoutesPage />} />
                  <Route path="metrics"      element={<MetricsPage />} />
                  <Route path="consumers"    element={<ConsumersPage />} />
                  <Route path="ai-providers" element={<AIProvidersPage />} />
                  <Route path="rate-limits"  element={<RateLimitsPage />} />
                  <Route path="wasm-plugins" element={<WasmPluginsPage />} />
                  <Route path="audit"        element={<AuditLogPage />} />
                  <Route path="checkpoints"  element={<StubPage name="Checkpoints" />} />
                  <Route path="regions"      element={<RegionsPage />} />
                  <Route path="policies"     element={<StubPage name="Policies" />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </QueryClientProvider>
        </AppErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  )
}
