'use client'

import { useState, useEffect } from 'react'
import { X, Building2, User, Save } from 'lucide-react'
import { useOrgData, Coordinator } from '@/context/OrgDataContext'

interface PersonnelTransferModalProps {
  isOpen: boolean
  onClose: () => void
  personName: string
  currentCoordinatorId?: string
  currentSubUnitId?: string
  onTransfer: (toCoordinatorId: string, toSubUnitId: string) => void
}

export default function PersonnelTransferModal({
  isOpen,
  onClose,
  personName,
  currentCoordinatorId,
  currentSubUnitId,
  onTransfer,
}: PersonnelTransferModalProps) {
  const { data } = useOrgData()
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>('')
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string>('')

  // Seçili koordinatörün alt birimlerini getir
  const availableSubUnits = selectedCoordinatorId
    ? data.coordinators.find(c => c.id === selectedCoordinatorId)?.subUnits || []
    : []

  useEffect(() => {
    if (isOpen) {
      // Modal açıldığında mevcut değerleri set et
      setSelectedCoordinatorId(currentCoordinatorId || '')
      setSelectedSubUnitId(currentSubUnitId || '')
    }
  }, [isOpen, currentCoordinatorId, currentSubUnitId])

  const handleTransfer = () => {
    if (selectedCoordinatorId && selectedSubUnitId) {
      onTransfer(selectedCoordinatorId, selectedSubUnitId)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Personel Taşı</h2>
              <p className="text-sm text-white/80">{personName}</p>
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
        <div className="p-6 space-y-4">
          {/* Koordinatörlük Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" /> Koordinatörlük
            </label>
            <select
              value={selectedCoordinatorId}
              onChange={(e) => {
                setSelectedCoordinatorId(e.target.value)
                setSelectedSubUnitId('') // Birim seçimini sıfırla
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Koordinatörlük Seçin</option>
              {data.coordinators.map(coord => (
                <option key={coord.id} value={coord.id}>
                  {coord.title}
                </option>
              ))}
            </select>
          </div>

          {/* Alt Birim Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" /> Alt Birim
            </label>
            <select
              value={selectedSubUnitId}
              onChange={(e) => setSelectedSubUnitId(e.target.value)}
              disabled={!selectedCoordinatorId || availableSubUnits.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedCoordinatorId
                  ? 'Önce koordinatörlük seçin'
                  : availableSubUnits.length === 0
                  ? 'Bu koordinatörlükte alt birim yok'
                  : 'Alt Birim Seçin'}
              </option>
              {availableSubUnits.map(subUnit => (
                <option key={subUnit.id} value={subUnit.id}>
                  {subUnit.title}
                </option>
              ))}
            </select>
            {selectedCoordinatorId && availableSubUnits.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Bu koordinatörlükte alt birim bulunmuyor. Önce alt birim oluşturun.
              </p>
            )}
          </div>
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
            onClick={handleTransfer}
            disabled={!selectedCoordinatorId || !selectedSubUnitId}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Taşı
          </button>
        </div>
      </div>
    </div>
  )
}
