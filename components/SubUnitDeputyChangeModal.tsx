'use client'

import { useState, useMemo } from 'react'
import { X, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Deputy {
  id: string
  name: string
  title: string
  color?: string
}

interface SubUnitDeputyChangeModalProps {
  isOpen: boolean
  onClose: () => void
  subUnitTitle: string
  currentDeputyId?: string
  deputies: Deputy[]
  onSave: (deputyId: string | null) => void
}

export default function SubUnitDeputyChangeModal({
  isOpen,
  onClose,
  subUnitTitle,
  currentDeputyId,
  deputies,
  onSave,
}: SubUnitDeputyChangeModalProps) {
  const [selectedDeputyId, setSelectedDeputyId] = useState<string | null>(currentDeputyId || null)

  const handleSave = () => {
    onSave(selectedDeputyId)
    onClose()
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Koordinatör Yardımcısı Değiştir</h2>
                <p className="text-sm text-gray-500">{subUnitTitle}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Koordinatör Yardımcısı Seçin
              </label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Bağlantıyı Kaldır seçeneği */}
                <button
                  type="button"
                  onClick={() => setSelectedDeputyId(null)}
                  className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                    selectedDeputyId === null
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      —
                    </div>
                    <div>
                      <div className="font-medium">Bağlantı Yok</div>
                      <div className="text-xs text-gray-500">Birime bağlı koordinatör yardımcısı yok</div>
                    </div>
                  </div>
                </button>

                {/* Deputy listesi */}
                {deputies.map((deputy) => (
                  <button
                    key={deputy.id}
                    type="button"
                    onClick={() => setSelectedDeputyId(deputy.id)}
                    className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                      selectedDeputyId === deputy.id
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: deputy.color || '#9333ea' }}
                      >
                        {deputy.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{deputy.name}</div>
                        <div className="text-xs text-gray-500">{deputy.title || 'Koordinatör Yardımcısı'}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {deputies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Henüz koordinatör yardımcısı eklenmemiş.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
            >
              Kaydet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
