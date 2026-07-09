import { useStore } from '../store/useStore'

export default function Header() {
  const setSpotlightOpen = useStore((state) => state.setSpotlightOpen)

  return (
    <header className="bg-surface text-primary font-label-md text-label-md h-16 fixed top-0 right-0 left-64 border-b border-outline-variant flex justify-end items-center px-margin-desktop w-[calc(100%-16rem)] z-10">
      {/* Discreet Spotlight Search Trigger */}
      <button
        onClick={() => setSpotlightOpen(true)}
        className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/60 rounded-full px-md py-xs shadow-sm transition-all duration-200 cursor-pointer text-body-sm font-label-sm"
        title="Cerca globalmente o digita comandi (Alt+S)"
      >
        <span className="material-symbols-outlined text-[18px]">search</span>
        <span className="hidden sm:inline">Cerca...</span>
        <span className="hidden sm:inline text-[9px] font-bold text-on-surface-variant/60 bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/40 uppercase">
          Alt+S
        </span>
      </button>
    </header>
  )
}
