import Sidebar from './Sidebar'
import Header from './Header'
import Spotlight from './Spotlight'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 mt-16 p-md">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
      <Spotlight />
    </div>
  )
}
