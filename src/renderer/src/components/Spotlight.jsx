import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

const getDefaultActions = (theme) => [
  {
    category: 'action',
    id: 'new_customer',
    title: '👥 Nuovo Cliente',
    subtitle: 'Registra un nuovo profilo cliente',
    route: '/clients',
    actionKey: 'action:new_customer'
  },
  {
    category: 'action',
    id: 'new_invoice',
    title: '📄 Emetti Nuova Fattura',
    subtitle: 'Emetti una nuova fattura per un cliente',
    route: '/invoices',
    actionKey: 'action:new_invoice'
  },
  {
    category: 'action',
    id: 'new_payment',
    title: '💸 Registra Nuovo Pagamento',
    subtitle: 'Registra un incasso per un cliente',
    route: '/payments',
    actionKey: 'action:new_payment'
  },
  {
    category: 'action',
    id: 'backup_db',
    title: '💾 Effettua Backup Database',
    subtitle: 'Esporta una copia del database SQLite',
    route: '',
    actionKey: 'action:backup_db'
  },
  {
    category: 'action',
    id: 'toggle_theme',
    title: '🌓 Cambia Tema (Chiaro/Scuro)',
    subtitle: `Attiva il tema ${theme === 'dark' ? 'chiaro' : 'scuro'}`,
    route: '',
    actionKey: 'action:toggle_theme'
  }
]

export default function Spotlight() {
  const navigate = useNavigate()
  const setTheme = useStore((state) => state.setTheme)
  const theme = useStore((state) => state.theme)

  const isOpen = useStore((state) => state.spotlightOpen)
  const setIsOpen = useStore((state) => state.setSpotlightOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  // Intercetta shortcut globali Alt+S o Alt+F
  useEffect(() => {
    const handleGlobalShortcut = (e) => {
      if (e.altKey && (e.key === 's' || e.key === 'S' || e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setTimeout(() => {
          setIsOpen(!isOpen)
          setSearchQuery('')
          setResults(getDefaultActions(theme))
          setSelectedIndex(0)
        }, 0)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleGlobalShortcut)
    return () => window.removeEventListener('keydown', handleGlobalShortcut)
  }, [theme, isOpen, setIsOpen])

  // Focus automatico sull'input all'apertura dello Spotlight
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Esegue la ricerca globale con debounce
  useEffect(() => {
    if (!isOpen) return

    if (!searchQuery.trim()) {
      setTimeout(() => {
        setResults(getDefaultActions(theme))
        setSelectedIndex(0)
      }, 0)
      return
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const dbResults = await window.api.globalSearch(searchQuery)
        
        // Filtra le azioni rapide predefinite in base al testo inserito
        const matchedActions = getDefaultActions(theme).filter(
          (a) =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
        )
        
        setTimeout(() => {
          setResults([...matchedActions, ...dbResults])
          setSelectedIndex(0)
        }, 0)
      } catch (err) {
        console.error('Errore ricerca globale:', err)
      }
    }, 200)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, isOpen, theme])

  // Gestione tastiera per navigare ed avviare la selezione (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prevIndex) => (prevIndex + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prevIndex) => (prevIndex - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  // Scroll automatico per mantenere visibile l'elemento evidenziato
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const handleSelect = (item) => {
    setIsOpen(false)

    if (item.category === 'action') {
      if (item.actionKey === 'action:toggle_theme') {
        setTheme(theme === 'dark' ? 'light' : 'dark')
      } else if (item.actionKey === 'action:backup_db') {
        window.api.backupDatabase()
      } else if (item.actionKey === 'action:new_customer') {
        navigate('/clients', { state: { openNewCustomerModal: true } })
      } else if (item.actionKey === 'action:new_invoice') {
        navigate('/invoices', { state: { openNewInvoiceModal: true } })
      } else if (item.actionKey === 'action:new_payment') {
        navigate('/payments', { state: { focusPaymentForm: true } })
      }
    } else if (item.category === 'invoice') {
      if (item.actionKey && item.actionKey.startsWith('invoice_edit:')) {
        const parts = item.actionKey.split(':')
        const invoiceId = parts[1]
        const customerId = parts[2]
        navigate('/clients', { state: { selectedCustomerId: customerId, openEditInvoiceId: invoiceId } })
      } else {
        navigate(item.route)
      }
    } else if (item.category === 'customer') {
      navigate(item.route, { state: { selectedCustomerId: item.id } })
    } else {
      navigate(item.route)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-background/50 backdrop-blur-[4px] z-[9999] flex justify-center items-start pt-[12vh] px-md transition-opacity duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-[620px] shadow-2xl overflow-hidden flex flex-col scale-100 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra di Ricerca */}
        <div className="flex items-center px-lg py-md border-b border-outline-variant gap-md">
          <span className="material-symbols-outlined text-on-surface-variant text-[24px]">search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Cerca clienti, fatture, pagamenti o digita un comando..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-headline-sm font-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:ring-0 p-0"
          />
          <span className="text-xs font-label-sm text-on-surface-variant/60 bg-surface-container-high px-2 py-1 rounded border border-outline-variant/60 uppercase">
            Esc
          </span>
        </div>

        {/* Elenco dei Risultati */}
        <div ref={resultsRef} className="max-h-[360px] overflow-y-auto p-2 space-y-0.5">
          {results.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-body-md">
              Nessun risultato o comando corrispondente trovato.
            </div>
          ) : (
            results.map((item, index) => {
              const isActive = index === selectedIndex
              return (
                <div
                  key={`${item.category}-${item.id}`}
                  data-active={isActive}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-md py-sm rounded-lg cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-primary text-on-primary shadow-sm font-semibold' 
                      : 'hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-body-md font-medium">{item.title}</span>
                    <span className={`text-xs font-normal ${isActive ? 'text-on-primary/80' : 'text-on-surface-variant/80'}`}>
                      {item.subtitle}
                    </span>
                  </div>
                  
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-on-primary/20 text-on-primary' 
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}>
                    {item.category === 'customer' && 'Cliente'}
                    {item.category === 'invoice' && 'Fattura'}
                    {item.category === 'payment' && 'Pagamento'}
                    {item.category === 'action' && 'Comando'}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Informativo */}
        <div className="bg-surface-container-low border-t border-outline-variant px-lg py-xs text-[11px] text-on-surface-variant/70 flex justify-between items-center">
          <div className="flex gap-md">
            <span>↑↓ per navigare</span>
            <span>↵ per confermare</span>
          </div>
          <div>
            Scorciatoia: <strong className="text-on-surface">Alt + S / Alt + F</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
