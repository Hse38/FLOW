'use client'

import { useState, useEffect } from 'react'
import { Coordinator, SubUnit } from '@/context/OrgDataContext'

interface NormKadroItem {
  type: 'coordinator' | 'subunit'
  coordinatorId: string
  subUnitId?: string
  title: string
  parentTitle?: string
  currentCount: number
  normKadro: number
}

interface NormKadroModalProps {
  isOpen: boolean
  onClose: () => void
  coordinators: Coordinator[]
  onUpdateCoordinator: (id: string, updates: Partial<Coordinator>) => void
  onUpdateSubUnit: (coordinatorId: string, subUnitId: string, updates: Partial<SubUnit>) => void
}

export default function NormKadroModal({
  isOpen,
  onClose,
  coordinators,
  onUpdateCoordinator,
  onUpdateSubUnit,
}: NormKadroModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)

  if (!isOpen) return null

  // Tüm birimleri ve koordinatörlükleri topla
  const getAllItems = (): NormKadroItem[] => {
    const items: NormKadroItem[] = []

    coordinators.forEach(coord => {
      // Koordinatörlük düzeyinde toplam kişi sayısı
      let totalPeople = 0
      coord.subUnits?.forEach(su => {
        totalPeople += su.people?.length || 0
      })

      items.push({
        type: 'coordinator',
        coordinatorId: coord.id,
        title: coord.title,
        currentCount: totalPeople,
        normKadro: coord.normKadro || 0,
      })

      // Alt birimler
      coord.subUnits?.forEach(su => {
        items.push({
          type: 'subunit',
          coordinatorId: coord.id,
          subUnitId: su.id,
          title: su.title,
          parentTitle: coord.title,
          currentCount: su.people?.length || 0,
          normKadro: su.normKadro || 0,
        })
      })
    })

    return items
  }

  const items = getAllItems()

  const handleSaveNorm = (item: NormKadroItem) => {
    if (item.type === 'coordinator') {
      onUpdateCoordinator(item.coordinatorId, { normKadro: editValue })
    } else if (item.type === 'subunit' && item.subUnitId) {
      onUpdateSubUnit(item.coordinatorId, item.subUnitId, { normKadro: editValue })
    }
    setEditingId(null)
  }

  const getStatusColor = (current: number, norm: number) => {
    if (norm === 0) return 'text-gray-400'
    if (current === norm) return 'text-green-600'
    if (current > norm) return 'text-red-600'
    return 'text-amber-600'
  }

  const getStatusBg = (current: number, norm: number) => {
    if (norm === 0) return 'bg-gray-50'
    if (current === norm) return 'bg-green-50'
    if (current > norm) return 'bg-red-50'
    return 'bg-amber-50'
  }

  // İstatistikler
  const stats = {
    total: items.filter(i => i.type === 'subunit').length,
    complete: items.filter(i => i.type === 'subunit' && i.normKadro > 0 && i.currentCount === i.normKadro).length,
    over: items.filter(i => i.type === 'subunit' && i.normKadro > 0 && i.currentCount > i.normKadro).length,
    under: items.filter(i => i.type === 'subunit' && i.normKadro > 0 && i.currentCount < i.normKadro).length,
    notSet: items.filter(i => i.type === 'subunit' && (!i.normKadro || i.normKadro === 0)).length,
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Norm Kadro Yönetimi
              </h2>
              <p className="text-blue-200 mt-1">Birim ve koordinatörlükler için norm kadro atamalarını yapın</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-blue-200">Toplam Birim</div>
            </div>
            <div className="bg-green-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-300">{stats.complete}</div>
              <div className="text-xs text-green-200">Tam Kadro</div>
            </div>
            <div className="bg-amber-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{stats.under}</div>
              <div className="text-xs text-amber-200">Eksik</div>
            </div>
            <div className="bg-red-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-300">{stats.over}</div>
              <div className="text-xs text-red-200">Fazla</div>
            </div>
            <div className="bg-gray-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-300">{stats.notSet}</div>
              <div className="text-xs text-gray-200">Atanmamış</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 border-b">Birim / Koordinatörlük</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 border-b w-32">Güncel Sayı</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 border-b w-40">Norm Kadro</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 border-b w-32">Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const itemId = item.subUnitId || item.coordinatorId
                const isEditing = editingId === itemId
                const diff = item.normKadro > 0 ? item.currentCount - item.normKadro : 0

                return (
                  <tr 
                    key={itemId}
                    className={`border-b hover:bg-gray-50 transition-colors ${item.type === 'coordinator' ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {item.type === 'coordinator' ? (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center ml-6">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className={`font-medium ${item.type === 'coordinator' ? 'text-blue-800' : 'text-gray-800'}`}>
                            {item.title}
                          </p>
                          {item.parentTitle && (
                            <p className="text-xs text-gray-400">{item.parentTitle}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-gray-700">{item.currentCount}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNorm(item)}
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-gray-300 text-gray-600 rounded hover:bg-gray-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(itemId)
                            setEditValue(item.normKadro)
                          }}
                          className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                            item.normKadro > 0 
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {item.normKadro > 0 ? item.normKadro : 'Ata'}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.normKadro > 0 ? (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(item.currentCount, item.normKadro)} ${getStatusColor(item.currentCount, item.normKadro)}`}>
                          {diff === 0 ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Tam
                            </>
                          ) : diff > 0 ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              +{diff} Fazla
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                              {diff} Eksik
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Norm kadro değerlerini düzenlemek için tablodaki "Ata" butonlarına tıklayın
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
