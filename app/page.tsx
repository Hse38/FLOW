'use client'

import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, ChevronDown, ChevronUp, Settings, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'

// Dynamically import OrgCanvas to avoid SSR issues with React Flow
const OrgCanvas = dynamic(() => import('@/components/OrgCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600 font-medium">Organizasyon şeması yükleniyor...</p>
      </div>
    </div>
  ),
})

// Default legend items
const defaultLegendItems = [
  { id: '1', color: 'from-indigo-600 to-indigo-800', label: 'Yönetim' },
  { id: '2', color: 'from-blue-500 to-blue-700', label: 'Koordinatörlük' },
  { id: '3', color: 'from-emerald-400 to-emerald-600', label: 'Birim' },
  { id: '4', color: 'from-purple-400 to-purple-600', label: 'Kişi' },
]

// Available colors for legend
const colorOptions = [
  'from-indigo-600 to-indigo-800',
  'from-blue-500 to-blue-700',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
  'from-orange-400 to-orange-600',
  'from-red-400 to-red-600',
  'from-pink-400 to-pink-600',
  'from-yellow-400 to-yellow-600',
  'from-teal-400 to-teal-600',
  'from-gray-500 to-gray-700',
]

export default function Home() {
  const [isLegendOpen, setIsLegendOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [legendItems, setLegendItems] = useState(defaultLegendItems)
  const [editingItem, setEditingItem] = useState<string | null>(null)

  const addLegendItem = () => {
    const newItem = {
      id: Date.now().toString(),
      color: colorOptions[legendItems.length % colorOptions.length],
      label: 'Yeni Öğe',
    }
    setLegendItems([...legendItems, newItem])
  }

  const removeLegendItem = (id: string) => {
    setLegendItems(legendItems.filter(item => item.id !== id))
  }

  const updateLegendItem = (id: string, updates: { color?: string; label?: string }) => {
    setLegendItems(legendItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* Header Overlay */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-2.5 rounded-xl shadow-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Organizasyon Şeması
                </h1>
                <p className="text-sm text-gray-600">İnteraktif Kurumsal Yapı Haritası</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">İpucu:</span> Fareyi kullanarak yakınlaştırın ve gezinin
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Canvas with top padding for header */}
      <div className="w-full h-screen pt-20">
        <OrgCanvas />
      </div>

      {/* Legend Overlay - Collapsible */}
      <div className="absolute bottom-6 left-6 z-10">
        <AnimatePresence mode="wait">
          {isLegendOpen ? (
            <motion.div
              key="legend-open"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg p-4 max-w-xs"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Rehber</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}
                    title="Düzenle"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsLegendOpen(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    title="Küçült"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Legend Items */}
              <div className="space-y-2">
                {legendItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    {isEditing ? (
                      <>
                        {/* Color Picker */}
                        <div className="relative">
                          <button
                            onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                            className={`w-4 h-4 rounded bg-gradient-to-br ${item.color} cursor-pointer hover:scale-110 transition-transform`}
                          />
                          {editingItem === item.id && (
                            <div className="absolute left-0 top-6 bg-white rounded-lg shadow-xl border p-2 grid grid-cols-5 gap-1 z-20">
                              {colorOptions.map((color, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    updateLegendItem(item.id, { color })
                                    setEditingItem(null)
                                  }}
                                  className={`w-5 h-5 rounded bg-gradient-to-br ${color} hover:scale-110 transition-transform`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Editable Label */}
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateLegendItem(item.id, { label: e.target.value })}
                          className="flex-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {/* Delete Button */}
                        <button
                          onClick={() => removeLegendItem(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`w-4 h-4 rounded bg-gradient-to-br ${item.color}`}></div>
                        <span className="text-xs text-gray-700">{item.label}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Button (when editing) */}
              {isEditing && (
                <button
                  onClick={addLegendItem}
                  className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg py-1.5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Öğe Ekle
                </button>
              )}

              {/* Footer */}
              {!isEditing && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Bir düğüme tıklayarak detaylı bilgi görüntüleyin
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Collapsed State - Circle Button */
            <motion.button
              key="legend-closed"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsLegendOpen(true)}
              className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
              title="Rehberi Aç"
            >
              <ChevronUp className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Helper (Mobile) */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        className="md:hidden absolute bottom-6 right-6 z-10 bg-indigo-600 text-white rounded-full px-4 py-2 shadow-lg text-xs font-medium"
      >
        2 parmakla kaydırın
      </motion.div>
    </main>
  )
}
