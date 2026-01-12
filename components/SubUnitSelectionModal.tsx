'use client'

import { useState, useEffect } from 'react'
import { X, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SubUnit {
  id: string
  title: string
}

interface SubUnitSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  coordinatorId: string
  coordinatorTitle: string
  subUnits: SubUnit[]
  onSelect: (subUnitId: string) => void
}

export default function SubUnitSelectionModal({
  isOpen,
  onClose,
  coordinatorId,
  coordinatorTitle,
  subUnits,
  onSelect,
}: SubUnitSelectionModalProps) {
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setSelectedSubUnitId('')
    }
  }, [isOpen])

  const handleSelect = () => {
    if (selectedSubUnitId) {
      onSelect(selectedSubUnitId)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Birim Seç</h2>
                <p className="text-sm text-gray-500">{coordinatorTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {subUnits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Bu koordinatörlükte birim bulunmuyor</p>
                <p className="text-sm mt-1">Önce bir birim oluşturmanız gerekiyor</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birim Seçin *
                  </label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {subUnits.map(subUnit => (
                      <button
                        key={subUnit.id}
                        type="button"
                        onClick={() => setSelectedSubUnitId(subUnit.id)}
                        className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                          selectedSubUnitId === subUnit.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="font-medium">{subUnit.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedSubUnitId || subUnits.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Devam Et
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
