import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Titlebar from './Titlebar'
import StatusBar from './StatusBar'
import Spotlight from './Spotlight'

export default function Layout({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-apple-canvas text-apple-text antialiased select-none font-sans">
      {/* Top macOS Window Titlebar */}
      <Titlebar />

      {/* Middle Row: Sidebar + Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} />

        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Workspace Central Area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden relative">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden absolute top-2 left-2 z-20 p-1.5 rounded bg-white border border-apple-border shadow-xs text-apple-secondary hover:text-apple-text cursor-pointer"
            aria-label="Apri menu"
          >
            <span className="material-symbols-outlined text-[16px]">menu</span>
          </button>

          {isDashboard ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
              {children}
            </div>
          ) : (
            <main className="flex-1 overflow-y-auto p-6 bg-apple-canvas">
              <div className="max-w-[1400px] mx-auto">{children}</div>
            </main>
          )}

          {/* Bottom Desktop Status Bar */}
          <StatusBar />
        </div>
      </div>

      <Spotlight />
    </div>
  )
}
