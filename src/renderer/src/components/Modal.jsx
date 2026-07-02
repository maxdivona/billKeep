import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children }) {
  // Keypress event listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scrolling
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative bg-surface-container-low border border-outline-variant rounded-xl max-w-[500px] w-full shadow-xl flex flex-col z-10 overflow-hidden">
        {/* Modal Header */}
        <div className="px-md py-sm border-b border-outline-variant flex justify-between items-center bg-surface-container">
          <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
            {title}
          </h3>
          <button
            className="text-on-surface-variant hover:text-on-surface p-sm rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-md">{children}</div>
      </div>
    </div>
  )
}
