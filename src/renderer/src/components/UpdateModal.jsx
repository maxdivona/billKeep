import Modal from './Modal'
import { useStore } from '../store/useStore'

export default function UpdateModal({ isOpen, onClose }) {
  const { updateInfo, updateStatus, updateError, updateDownloadProgress, installUpdate, dismissUpdate } =
    useStore()

  const busy = updateStatus === 'downloading' || updateStatus === 'installing'

  const handleDismiss = () => {
    if (busy) return
    dismissUpdate()
    onClose()
  }

  const handleInstall = () => {
    installUpdate()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title="Aggiornamento disponibile">
      <div className="flex flex-col gap-4">
        <p className="text-body-md text-on-surface">
          È disponibile la versione <strong className="text-primary">{updateInfo?.version}</strong>{' '}
          di BillKeep (versione attuale: {updateInfo?.currentVersion}).
        </p>

        {updateInfo?.body && (
          <div className="text-body-sm text-on-surface-variant bg-surface-container p-sm rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
            {updateInfo.body}
          </div>
        )}

        {updateStatus === 'error' && (
          <p className="text-error font-label-md text-label-md">
            {"Errore durante l'aggiornamento: "}
            {updateError || 'riprova più tardi.'}
          </p>
        )}

        {busy ? (
          <div className="flex flex-col gap-2">
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all"
                style={{ width: `${updateDownloadProgress}%` }}
              ></div>
            </div>
            <p className="text-body-sm text-on-surface-variant text-center">
              {updateStatus === 'installing'
                ? 'Installazione in corso, riavvio imminente...'
                : `Download in corso... ${updateDownloadProgress}%`}
            </p>
          </div>
        ) : (
          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              onClick={handleDismiss}
            >
              Più tardi
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-primary hover:bg-primary/90 text-on-primary transition-colors shadow-sm cursor-pointer"
              onClick={handleInstall}
            >
              Aggiorna ora
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
