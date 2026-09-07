import { useState, useEffect, useRef } from 'react'

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  required = false,
  noResultsText = 'Nessun risultato trovato'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef(null)

  // Trova l'opzione attualmente selezionata
  const selectedOption = options.find((opt) => opt.id === value)

  // Memorizza il valore precedente per rilevare cambiamenti esterni e aggiornare la ricerca
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setSearchTerm(selectedOption ? selectedOption.name : '')
  }

  // Chiude la lista quando si clicca all'esterno del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        if (selectedOption) {
          setSearchTerm(selectedOption.name)
        } else {
          setSearchTerm('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedOption])

  // Filtra le opzioni in base al testo digitato (case-insensitive)
  const isCurrentlySelected = selectedOption && searchTerm === selectedOption.name
  const filteredOptions = options.filter((opt) => {
    if (isCurrentlySelected && !isOpen) return true
    return opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleSelect = (option) => {
    onChange(option.id)
    setSearchTerm(option.name)
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        setFocusedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0))
        e.preventDefault()
        break
      case 'ArrowUp':
        setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1))
        e.preventDefault()
        break
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex])
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0])
        }
        e.preventDefault()
        break
      case 'Escape':
        setIsOpen(false)
        if (selectedOption) {
          setSearchTerm(selectedOption.name)
        } else {
          setSearchTerm('')
        }
        setFocusedIndex(-1)
        e.preventDefault()
        break
      default:
        break
    }
  }

  // Scrolla l'elemento focalizzato in vista se necessario
  const listRef = useRef(null)
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[focusedIndex]
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedIndex])

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Campo di Ricerca */}
      <div className="relative flex items-center">
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="searchable-select-listbox"
          aria-activedescendant={
            focusedIndex >= 0 && filteredOptions[focusedIndex]
              ? `searchable-select-option-${filteredOptions[focusedIndex].id}`
              : undefined
          }
          className="w-full border border-outline-variant rounded-md pl-3 pr-10 py-2 bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md placeholder:text-on-surface-variant/50 transition-colors"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!isOpen) setIsOpen(true)
            setFocusedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          required={required && !value}
        />

        {/* Pulsanti di Azione */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
              title="Annulla selezione"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
          >
            <span
              className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            >
              keyboard_arrow_down
            </span>
          </button>
        </div>
      </div>

      {/* Lista dei Risultati */}
      {isOpen && (
        <div
          id="searchable-select-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface-container-low border border-outline-variant rounded-lg shadow-lg z-50 py-1"
          ref={listRef}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = option.id === value
              const isFocused = index === focusedIndex
              return (
                <button
                  key={option.id}
                  id={`searchable-select-option-${option.id}`}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 text-body-md font-body-md cursor-pointer transition-colors duration-150 flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : isFocused
                        ? 'bg-surface-container-high text-on-surface'
                        : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span>{option.name}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      check
                    </span>
                  )}
                </button>
              )
            })
          ) : (
            <div className="px-3 py-2 text-body-sm text-on-surface-variant/70 italic text-center">
              {noResultsText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
