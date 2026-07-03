import { useState } from 'react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('info')

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Impostazioni</h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Gestisci le preferenze dell&apos;applicazione e visualizza i dettagli di sistema.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Submenu Navigation */}
        <div className="w-full lg:w-64 shrink-0 bg-surface-container-low border border-outline-variant rounded-xl p-sm flex flex-col gap-1.5 h-fit">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-md px-sm py-sm rounded-lg text-left transition-all duration-150 cursor-pointer font-label-md text-label-md ${
              activeTab === 'info'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">info</span>
            Info Applicazione
          </button>

          <button
            disabled
            className="flex items-center gap-md px-sm py-sm rounded-lg text-left text-on-surface-variant/45 cursor-not-allowed font-label-md text-label-md"
          >
            <span className="material-symbols-outlined">tune</span>
            Preferenze Generali
          </button>

          <button
            disabled
            className="flex items-center gap-md px-sm py-sm rounded-lg text-left text-on-surface-variant/45 cursor-not-allowed font-label-md text-label-md"
          >
            <span className="material-symbols-outlined">database</span>
            Database & Backup
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl p-lg shadow-sm">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* App Identity Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-outline-variant">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-on-primary shadow-md shrink-0">
                  <span className="material-symbols-outlined text-[48px]">
                    account_balance_wallet
                  </span>
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                    BillKeep
                  </h3>
                  <p className="text-body-md text-on-surface-variant">
                    Applicazione desktop locale per la gestione di fatture, pagamenti e contabilità
                    in partita doppia.
                  </p>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      Versione 0.1
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                      Stato: Beta
                    </span>
                  </div>
                </div>
              </div>

              {/* Developer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container p-md border border-outline-variant/60 rounded-xl space-y-2">
                  <h4 className="font-label-md text-label-md font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    Sviluppatore
                  </h4>
                  <p className="font-headline-sm text-headline-sm text-on-surface font-medium">
                    Massimo Di Vona
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    © 2026 Massimo Di Vona. Tutti i diritti riservati.
                  </p>
                </div>

                <div className="bg-surface-container p-md border border-outline-variant/60 rounded-xl space-y-2">
                  <h4 className="font-label-md text-label-md font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">copyright</span>
                    Dettagli Legali & Licenza
                  </h4>
                  <p className="text-body-md text-on-surface">
                    Uso esclusivo e locale per la gestione contabile interna.
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    Tutti i diritti sono riservati all&apos;autore del software.
                  </p>
                </div>
              </div>

              {/* Technical Stack Section */}
              <div className="space-y-3">
                <h4 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px]">widgets</span>
                  Struttura Tecnica (Tech Stack)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      terminal
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Runtime
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Electron
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      token
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Frontend
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        React + Vite
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      database
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Database Engine
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        SQLite (better-sqlite3)
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      css
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Styling CSS
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Tailwind CSS
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      account_tree
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Stato Globale
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Zustand
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      security
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Architettura
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Context Isolation & IPC
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
