'use client'

import { useState, useMemo } from 'react'
import { X, UserPlus, User, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Person } from '@/context/OrgDataContext'

interface PersonnelMetadata {
  type: 'coordinator' | 'deputy' | 'subunit-person' | 'city-person'
  coordinatorId?: string
  coordinatorTitle?: string
  subUnitId?: string
  subUnitTitle?: string
  city?: string
}

interface PersonnelItem {
  person: Person
  metadata: PersonnelMetadata
}

interface AddPersonSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  coordinatorId: string
  subUnitId: string
  allPersonnel: PersonnelItem[]
  onAddExisting: (personId: string, sourceCoordinatorId: string, sourceSubUnitId: string) => void
  onAddNew: () => void
}

export default function AddPersonSelectionModal({
  isOpen,
  onClose,
  coordinatorId,
  subUnitId,
  allPersonnel,
  onAddExisting,
  onAddNew,
}: AddPersonSelectionModalProps) {
  const [selectedTab, setSelectedTab] = useState<'existing' | 'new'>('existing')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter out personnel that are already in the target sub-unit
  const availablePersonnel = useMemo(() => {
    return allPersonnel.filter(item => {
      // Skip if this person is already in the target sub-unit
      if (item.metadata.coordinatorId === coordinatorId && item.metadata.subUnitId === subUnitId) {
        return false
      }
      // Only include subunit-person types (not coordinators/deputies)
      return item.metadata.type === 'subunit-person'
    })
  }, [allPersonnel, coordinatorId, subUnitId])

  // Filter by search term
  const filteredPersonnel = useMemo(() => {
    if (!searchTerm.trim()) return availablePersonnel
    const term = searchTerm.toLowerCase()
    return availablePersonnel.filter(item =>
      item.person.name.toLowerCase().includes(term) ||
      item.person.title?.toLowerCase().includes(term) ||
      item.metadata.coordinatorTitle?.toLowerCase().includes(term) ||
      item.metadata.subUnitTitle?.toLowerCase().includes(term)
    )
  }, [availablePersonnel, searchTerm])

  const handleAddExisting = (item: PersonnelItem) => {
    if (item.metadata.coordinatorId && item.metadata.subUnitId && item.person.id) {
      onAddExisting(item.person.id, item.metadata.coordinatorId, item.metadata.subUnitId)
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Personel Ekle</h2>
                <p className="text-sm text-gray-500">Birime personel ekleyin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setSelectedTab('existing')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                selectedTab === 'existing'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Var Olanı Ekle
            </button>
            <button
              onClick={() => setSelectedTab('new')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                selectedTab === 'new'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Yeni Ekle
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedTab === 'existing' ? (
              <>
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Personel ara (isim, ünvan, birim)..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Personnel List */}
                {filteredPersonnel.length > 0 ? (
                  <div className="space-y-3">
                    {filteredPersonnel.map((item, idx) => (
                      <button
                        key={`${item.metadata.coordinatorId}-${item.metadata.subUnitId}-${item.person.id}-${idx}`}
                        onClick={() => handleAddExisting(item)}
                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                            style={{ backgroundColor: item.person.color || '#6366f1' }}
                          >
                            {item.person.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-700 break-words">
                              {item.person.name}
                            </div>
                            {item.person.title && (
                              <div className="text-sm text-gray-600 mt-2">{item.person.title}</div>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-gray-100 rounded-md">
                                {item.metadata.coordinatorTitle || 'Koordinatörlük'}
                              </span>
                              {item.metadata.subUnitTitle && (
                                <span className="px-2 py-1 bg-gray-100 rounded-md">
                                  {item.metadata.subUnitTitle}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <UserPlus className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm.trim() ? (
                      <div>
                        <p className="text-sm">Arama sonucu bulunamadı.</p>
                        <p className="text-xs mt-1">Farklı bir arama terimi deneyin.</p>
                      </div>
                    ) : (
                      <div>
                        <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">Eklenecek mevcut personel bulunamadı.</p>
                        <p className="text-xs mt-1">Tüm personeller zaten bu birimde.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Plus className="w-16 h-16 mx-auto mb-4 text-blue-200" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Yeni Personel Ekle</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Yeni bir personel oluşturmak için "Yeni Ekle" butonuna tıklayın.
                </p>
                <button
                  onClick={() => {
                    onAddNew()
                    onClose()
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Yeni Personel Ekle
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedTab === 'existing' && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Mevcut personelleri başka birimlerden bu birime ekleyebilirsiniz.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
