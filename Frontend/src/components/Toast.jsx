import React from 'react'

export default function Toast({ toast }) {
  if (!toast) return null
  const icons = { success: '✦', error: '✕', info: '◈' }
  return (
    <div className={`toast toast-${toast.type}`}>
      <span>{icons[toast.type] || '◈'}</span>
      {toast.text}
    </div>
  )
}