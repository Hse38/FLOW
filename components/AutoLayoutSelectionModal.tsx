'use client'

import { useEffect } from 'react'

interface AutoLayoutSelectionModalProps {
  isOpen: boolean
  hasSelectedNodes: boolean
  selectedCount: number
  onSelectSelected: () => void
  onSelectAll: () => void
  onCancel: () => void
}

export default function AutoLayoutSelectionModal({
  isOpen,
  hasSelectedNodes,
  selectedCount,
  onSelectSelected,
  onSelectAll,
  onCancel
}: AutoLayoutSelectionModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 bg-emerald-100 text-emerald-600 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v4a2 2 0 002 2h2a2 2 0 002-2V3m0 18v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4M4 9h4a2 2 0 012 2v2a2 2 0 01-2 2H4m16-6h-4a2 2 0 00-2 2v2a2 2 0 002 2h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Oto Yerleştir
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Oto yerleştir işlemini nereye uygulamak istiyorsunuz?
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {hasSelectedNodes && (
              <button
                type="button"
                onClick={onSelectSelected}
                className="w-full px-4 py-3 text-left bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300 rounded-lg transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 group-hover:text-emerald-950">
                      Seçili Node'ları Oto Yerleştir
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      {selectedCount} adet seçili node için uygula
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={onSelectAll}
              className="w-full px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900 group-hover:text-blue-950">
                    Tüm Sayfaya Uygula
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Tüm node'lar için otomatik yerleştir (onay gerektirir)
                  </p>
                </div>
                <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
