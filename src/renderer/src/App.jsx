import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import UpdateManager from './components/UpdateManager'

// Static imports for instant page changes
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import Journal from './pages/Journal'
import Settings from './pages/Settings'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
}

const pageTransition = {
  ease: 'easeInOut',
  duration: 0.15
}

function PageWrapper({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          }
        />
        <Route
          path="/clients"
          element={
            <PageWrapper>
              <Customers />
            </PageWrapper>
          }
        />
        <Route
          path="/invoices"
          element={
            <PageWrapper>
              <Invoices />
            </PageWrapper>
          }
        />
        <Route
          path="/payments"
          element={
            <PageWrapper>
              <Payments />
            </PageWrapper>
          }
        />
        <Route
          path="/journal"
          element={
            <PageWrapper>
              <Journal />
            </PageWrapper>
          }
        />
        <Route
          path="/settings"
          element={
            <PageWrapper>
              <Settings />
            </PageWrapper>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <HashRouter>
      <Layout>
        <AnimatedRoutes />
      </Layout>
      <UpdateManager />
    </HashRouter>
  )
}

export default App
