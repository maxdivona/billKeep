export default function Header() {
  return (
    <header className="bg-surface text-primary font-label-md text-label-md h-16 fixed top-0 right-0 left-64 border-b border-outline-variant flex justify-end items-center px-margin-desktop w-[calc(100%-16rem)] z-10">
      {/* Search Bar */}
      <div className="flex items-center bg-surface-container-low rounded-full px-md py-sm border border-outline-variant w-1/3 max-w-[400px] focus-within:border-primary transition-colors">
        <span className="material-symbols-outlined text-on-surface-variant mr-sm">search</span>
        <input
          className="bg-transparent border-none outline-none w-full text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:ring-0 p-0"
          placeholder="Cerca..."
          type="text"
        />
      </div>
    </header>
  )
}
