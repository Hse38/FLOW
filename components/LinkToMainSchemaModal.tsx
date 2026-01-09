'use client'

import { useState, useEffect } from 'react'
import { X, Link2, Building2, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Coordinator {
  id: string
  title: string
  parent: string
}

interface LinkToMainSchemaModalProps {
  isOpen: boolean
  onClose: () => void
  onLink: (coordinatorId: string) => void
  currentSchemaId: string
  currentSchemaName: string
}

export default function LinkToMainSchemaModal({
  isOpen,
  onClose,
  onLink,
  currentSchemaId,
  currentSchemaName,
}: LinkToMainSchemaModalProps) {
  const [mainSchemaCoordinators, setMainSchemaCoordinators] = useState<Coordinator[]>([])
  const [selectedCoordinator, setSelectedCoordinator] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Ana şemadaki koordinatörleri yükle
  useEffect(() => {
    if (isOpen) {
      const mainDataStr = localStorage.getItem('orgData_main') || localStorage.getItem('orgData')
      if (mainDataStr) {
        try {
          const mainData = JSON.parse(mainDataStr)
          // Hem coordinators hem de mainCoordinators'ı al
          const allCoordinators = [
            ...(mainData.coordinators || []).map((c: any) => ({
              id: c.id,
              title: c.title,
              parent: c.parent,
            })),
            ...(mainData.mainCoordinators || []).map((c: any) => ({
              id: c.id,
              title: c.title,
              parent: c.parent || 'root',
            })),
          ]
          setMainSchemaCoordinators(allCoordinators)
        } catch (e) {
          console.error('Failed to load main schema:', e)
        }
      }
    }
  }, [isOpen])

  const filteredCoordinators = mainSchemaCoordinators.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLink = () => {
    if (selectedCoordinator) {
      onLink(selectedCoordinator)
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Ana Şemaya Bağla</h2>
                <p className="text-sm text-white/70">{currentSchemaName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Bu şemayı ana şemadaki hangi koordinatörlüğün altına bağlamak istiyorsunuz?
              Bağlandıktan sonra, o koordinatörlüğe tıklandığında bu şema detay olarak görünecek.
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Koordinatörlük ara..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Coordinator List */}
            <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-xl">
              {filteredCoordinators.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Koordinatörlük bulunamadı</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredCoordinators.map((coord) => (
                    <button
                      key={coord.id}
                      onClick={() => setSelectedCoordinator(coord.id)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                        selectedCoordinator === coord.id
                          ? 'bg-indigo-50 border-l-4 border-indigo-500'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <Building2 className={`w-5 h-5 ${
                        selectedCoordinator === coord.id ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        selectedCoordinator === coord.id ? 'text-indigo-700' : 'text-gray-700'
                      }`}>
                        {coord.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
            >
              İptal
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedCoordinator}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Bağla
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
