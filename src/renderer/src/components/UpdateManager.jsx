import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import UpdateModal from './UpdateModal'

const UPDATE_DISMISSED_VERSION_KEY = 'billkeep_update_dismissed_version'

// Controlla la presenza di aggiornamenti all'avvio dell'app e mostra il
// prompt una sola volta per versione: se l'utente rifiuta, non viene più
// interrotto finché non esce una versione successiva.
export default function UpdateManager() {
  const { updateStatus, updateInfo, checkForUpdates } = useStore()
  const [modalOpen, setModalOpen] = useState(false)
  const hasPromptedRef = useRef(false)

  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  useEffect(() => {
    if (updateStatus !== 'available' || !updateInfo || hasPromptedRef.current) return

    let dismissedVersion = null
    try {
      dismissedVersion = localStorage.getItem(UPDATE_DISMISSED_VERSION_KEY)
    } catch {
      dismissedVersion = null
    }

    if (dismissedVersion !== updateInfo.version) {
      hasPromptedRef.current = true
      // Usa setTimeout per evitare cascading render sincroni derivanti da setState nell'effetto
      setTimeout(() => setModalOpen(true), 0)
    }
  }, [updateStatus, updateInfo])

  return <UpdateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
}
