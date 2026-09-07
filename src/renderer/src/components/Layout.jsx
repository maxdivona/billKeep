import { useState } from 'react'
import Sidebar from './Sidebar'
import Spotlight from './Spotlight'

export default function Layout({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {/* Backdrop per il drawer su schermi stretti */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-on-surface/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-md left-md z-10 p-sm rounded-lg bg-surface border border-outline-variant shadow-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          aria-label="Apri il menu di navigazione"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <main className="flex-1 p-md pt-16 md:pt-lg">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
      <Spotlight />
    </div>
  )
}
