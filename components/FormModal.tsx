'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'

interface SubUnit {
  id: string
  title: string
}

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  type: 'subunit' | 'deputy' | 'responsibility' | 'person' | 'edit' | 'edit-person' | 'coordinator'
  initialData?: any
  onSave: (data: any) => void
  subUnits?: SubUnit[]
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  type,
  initialData,
  onSave,
  subUnits = [],
}: FormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [responsibilities, setResponsibilities] = useState<string[]>([''])
  const isSubmittingRef = useRef(false) // Çift submit'i önlemek için

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {})
      setResponsibilities(initialData?.responsibilities || [''])
      isSubmittingRef.current = false // Modal açıldığında submit flag'ini sıfırla
    } else {
      // Modal kapandığında da sıfırla
      isSubmittingRef.current = false
    }
  }, [isOpen, initialData])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Çift submit'i önle - daha güçlü kontrol
    if (isSubmittingRef.current) {
      e.stopPropagation()
      return
    }
    
    isSubmittingRef.current = true
    
    try {
      // Form verisini hazırla - initialData'dan id'yi de ekle (düzenleme için)
      const submitData = { 
        ...formData, 
        id: initialData?.id || formData.id, // Düzenleme için id'yi koru
        responsibilities: responsibilities.filter(r => r && r.trim()) 
      }
      
      // onSave'yi çağır
      onSave(submitData)
      
      // Modal'ı hemen kapat (çift çağrıyı önlemek için)
      onClose()
    } finally {
      // Flag'i gecikmeyle sıfırla (çift çağrıyı önlemek için)
      setTimeout(() => {
        isSubmittingRef.current = false
      }, 1000)
    }
  }, [formData, responsibilities, initialData, onSave, onClose])

  const addResponsibility = () => {
    setResponsibilities([...responsibilities, ''])
  }

  const updateResponsibility = (index: number, value: string) => {
    const updated = [...responsibilities]
    updated[index] = value
    setResponsibilities(updated)
  }

  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index))
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form id="form-modal-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Alt Birim / Koordinatör Formu */}
            {(type === 'subunit' || type === 'edit') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birim Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Tasarım Birimi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    rows={2}
                    placeholder="Birim hakkında kısa açıklama"
                  />
                </div>
              </>
            )}

            {/* Koordinatör Formu */}
            {type === 'coordinator' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Büşra COŞKUN"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ünvan
                  </label>
                  <input
                    type="text"
                    value={formData.title || 'Koordinatör'}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Koordinatör"
                  />
                </div>
              </>
            )}

            {/* Yardımcı Formu */}
            {type === 'deputy' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Ahmet Yılmaz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ünvan
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Koordinatör Yardımcısı (isteğe bağlı)"
                  />
                </div>
              </>
            )}

            {/* Kişi Formu */}
            {type === 'person' && (
              <>
                {subUnits.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Birim Seçin *
                    </label>
                    <select
                      required
                      value={formData.subUnitId || ''}
                      onChange={(e) => setFormData({ ...formData, subUnitId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Birim seçin...</option>
                      {subUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Ayşe Kaya"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ünvan
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Yazılım Geliştirici"
                  />
                </div>
              </>
            )}

            {/* Personel Düzenleme Formu */}
            {type === 'edit-person' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Ayşe Kaya"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ünvan
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Örn: Yazılım Geliştirici"
                  />
                </div>
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-indigo-600 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                    </svg>
                    Eğitim Bilgileri
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Üniversite
                      </label>
                      <input
                        type="text"
                        value={formData.university || ''}
                        onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Örn: İstanbul Teknik Üniversitesi"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bölüm
                      </label>
                      <input
                        type="text"
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Örn: Bilgisayar Mühendisliği"
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    İş Kalemleri / Görev Tanımı
                  </h3>
                  <textarea
                    value={formData.jobDescription || ''}
                    onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    rows={4}
                    placeholder="Personelin görev tanımı ve iş kalemleri..."
                  />
                </div>
              </>
            )}

            {/* Sorumluluklar - Tüm tipler için */}
            {(type === 'responsibility' || type === 'subunit' || type === 'deputy' || type === 'edit' || type === 'coordinator') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görevler / Sorumluluklar
                </label>
                <div className="space-y-2">
                  {responsibilities.map((resp, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={resp}
                        onChange={(e) => updateResponsibility(index, e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        placeholder={`Görev ${index + 1}`}
                      />
                      {responsibilities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeResponsibility(index)}
                          className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addResponsibility}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Görev Ekle
                  </button>
                </div>
              </div>
            )}
          </form>

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
              type="submit"
              form="form-modal-form"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmittingRef.current}
            >
              Kaydet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
