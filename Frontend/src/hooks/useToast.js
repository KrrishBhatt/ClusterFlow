import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((text, type = 'info') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const success = useCallback((text) => show(text, 'success'), [show])
  const error   = useCallback((text) => show(text, 'error'),   [show])
  const info    = useCallback((text) => show(text, 'info'),     [show])

  return { toast, success, error, info }
}