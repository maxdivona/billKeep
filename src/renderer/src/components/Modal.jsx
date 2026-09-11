import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ isOpen, onClose, title, children }) {
  const panelRef = useRef(null)
  // onClose può essere una nuova funzione ad ogni render del genitore (es.
  // un arrow function inline): usiamo una ref per leggerne sempre la
  // versione più recente senza dover includerla tra le dipendenze degli
  // effect sottostanti, che altrimenti si ri-eseguirebbero (rubando il
  // focus dal campo in cui si sta scrivendo) ad ogni singola battitura.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Keypress event listener for Escape key e focus trap (Tab/Shift+Tab
  // restano confinati al pannello finché la modale è aperta)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scrolling
      document.body.style.overflow = 'hidden'

      // Sposta il focus iniziale dentro il pannello, solo all'apertura
      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusable && focusable.length > 0) {
        focusable[0].focus()
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white border border-apple-border rounded-xl max-w-[500px] w-full shadow-2xl flex flex-col z-10 overflow-hidden animate-scale-in"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-apple-border flex justify-between items-center bg-slate-50/90">
          <h3 className="font-semibold text-[15px] text-apple-text">
            {title}
          </h3>
          <button
            className="text-apple-subtle hover:text-apple-text p-1 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
