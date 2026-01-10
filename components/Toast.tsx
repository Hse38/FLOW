'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

let toastIdCounter = 0
const toasts: Toast[] = []
const listeners: ((toasts: Toast[]) => void)[] = []

export const showToast = (message: string, type: ToastType = 'info', duration: number = 4000) => {
  const id = `toast-${toastIdCounter++}`
  const newToast: Toast = { id, message, type }
  toasts.push(newToast)
  listeners.forEach(listener => listener([...toasts]))
  
  // Auto-remove after specified duration
  setTimeout(() => {
    const index = toasts.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.splice(index, 1)
      listeners.forEach(listener => listener([...toasts]))
    }
  }, duration)
}

export default function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts)
    }
    listeners.push(listener)
    setCurrentToasts([...toasts])
    
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full">
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} border-2 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 text-sm font-medium">
            {toast.message}
          </div>
          <button
            onClick={() => {
              const index = toasts.findIndex(t => t.id === toast.id)
              if (index > -1) {
                toasts.splice(index, 1)
                listeners.forEach(listener => listener([...toasts]))
              }
            }}
            className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
