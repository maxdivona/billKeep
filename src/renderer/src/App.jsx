import React, { Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Lazy loaded page components
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Customers = React.lazy(() => import('./pages/Customers'))
const Invoices = React.lazy(() => import('./pages/Invoices'))
const Payments = React.lazy(() => import('./pages/Payments'))
const Journal = React.lazy(() => import('./pages/Journal'))
const Settings = React.lazy(() => import('./pages/Settings'))

function App() {
  return (
    <HashRouter>
      <Layout>
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Customers />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  )
}

export default App
