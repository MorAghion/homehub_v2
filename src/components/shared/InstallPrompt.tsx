import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const { t } = useTranslation('common')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setVisible(false)
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 start-4 end-4 z-50 rounded-xl bg-(--color-surface) shadow-lg border border-(--color-accent) p-4 flex items-center gap-3">
      <div className="text-2xl">📱</div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-(--color-primary)">{t('installTitle', 'Add HomeHub to your home screen')}</p>
        <p className="text-xs text-(--color-muted)">{t('installSubtitle', 'Get the full app experience')}</p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleInstall}
          className="px-3 py-1 rounded-lg bg-(--color-primary) text-white text-xs font-medium"
        >
          {t('install', 'Install')}
        </button>
        <button
          onClick={() => setVisible(false)}
          className="px-3 py-1 rounded-lg text-(--color-muted) text-xs"
        >
          {t('dismiss', 'Dismiss')}
        </button>
      </div>
    </div>
  )
}
