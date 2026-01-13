'use client'

import { useState, useRef, useEffect } from 'react'
import { Person, Coordinator, Deputy, SubUnit } from '@/context/OrgDataContext'
import ConfirmationModal from './ConfirmationModal'
import { showToast } from './Toast'

interface RightDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  coordinator: Coordinator | null
  onUpdateCoordinator: (id: string, updates: Partial<Coordinator>) => void
  onAddDeputy: (coordinatorId: string, deputy: Omit<Deputy, 'id'>) => void
  onAddSubUnit: (coordinatorId: string, subUnit: Omit<SubUnit, 'id'>) => void
  onAddPerson: (coordinatorId: string, subUnitId: string, person: Omit<Person, 'id'>) => void
  onUpdatePerson: (coordinatorId: string, subUnitId: string, personId: string, updates: Partial<Person>) => void
  onDeletePerson: (coordinatorId: string, subUnitId: string, personId: string) => void
  onAddSubUnitResponsibility?: (coordinatorId: string, subUnitId: string, responsibility: string) => void
}

export default function RightDetailPanel({
  isOpen,
  onClose,
  coordinator,
  onUpdateCoordinator,
  onAddDeputy,
  onAddSubUnit,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onAddSubUnitResponsibility,
}: RightDetailPanelProps) {
  const [selectedPerson, setSelectedPerson] = useState<{
    person: Person
    coordinatorId: string
    subUnitId: string
    type: 'coordinator' | 'deputy' | 'subunit'
  } | null>(null)

  const [editMode, setEditMode] = useState<'coordinator' | 'deputy' | 'subunit' | 'person' | 'subunit-responsibility' | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
    onConfirm: () => void
    personToDelete?: { coordinatorId: string; subUnitId: string; personId: string; personName: string }
  } | null>(null)

  // Form states
  const [newDeputyForm, setNewDeputyForm] = useState({ name: '', title: '', responsibilities: '' })
  const [newSubUnitForm, setNewSubUnitForm] = useState({ title: '', description: '', responsibilities: '' })
  const [newPersonForm, setNewPersonForm] = useState({ name: '', title: '', subUnitId: '' })
  const [newSubUnitResponsibilityForm, setNewSubUnitResponsibilityForm] = useState({ subUnitId: '', responsibility: '' })

  // Guard refs - çift çağrıyı önlemek için (hooks must be called before early return)
  const addInProgressRef = useRef<Set<string>>(new Set())

  if (!isOpen || !coordinator) return null

  const handleSetCoordinator = () => {
    setEditMode('coordinator')
    setEditData({
      name: coordinator.coordinator?.name || '',
      title: coordinator.coordinator?.title || '',
      responsibilities: coordinator.responsibilities?.join('\n') || '',
    })
  }

  const handleSaveCoordinator = () => {
    if (editData) {
      onUpdateCoordinator(coordinator.id, {
        coordinator: {
          name: editData.name,
          title: editData.title,
        },
        responsibilities: editData.responsibilities.split('\n').filter((r: string) => r.trim()),
      })
      setEditMode(null)
      setEditData(null)
    }
  }

  const handleAddDeputy = () => {
    if (!newDeputyForm.name) return

    const addKey = `deputy-${coordinator.id}-${newDeputyForm.name}`
    if (addInProgressRef.current.has(addKey)) return

    addInProgressRef.current.add(addKey)

    try {
      // Duplicate kontrolü - title boş string veya belirtilen değer ile karşılaştır
      const existingDeputy = coordinator.deputies?.find(d => 
        d.name === newDeputyForm.name && 
        d.title === (newDeputyForm.title || '')
      )
      
      if (!existingDeputy) {
        onAddDeputy(coordinator.id, {
          name: newDeputyForm.name,
          title: newDeputyForm.title || '',
          responsibilities: newDeputyForm.responsibilities.split('\n').filter(r => r.trim()),
        })
        setNewDeputyForm({ name: '', title: '', responsibilities: '' })
        setEditMode(null)
      }
    } finally {
      setTimeout(() => {
        addInProgressRef.current.delete(addKey)
      }, 500)
    }
  }

  const handleAddSubUnit = () => {
    if (!newSubUnitForm.title) return

    const addKey = `subunit-${coordinator.id}-${newSubUnitForm.title}`
    if (addInProgressRef.current.has(addKey)) return

    addInProgressRef.current.add(addKey)

    try {
      // Duplicate kontrolü
      const existingSubUnit = coordinator.subUnits?.find(su => su.title === newSubUnitForm.title)
      
      if (!existingSubUnit) {
        onAddSubUnit(coordinator.id, {
          title: newSubUnitForm.title,
          description: newSubUnitForm.description || '',
          responsibilities: newSubUnitForm.responsibilities.split('\n').filter(r => r.trim()),
          people: [],
        })
        setNewSubUnitForm({ title: '', description: '', responsibilities: '' })
        setEditMode(null)
      }
    } finally {
      setTimeout(() => {
        addInProgressRef.current.delete(addKey)
      }, 500)
    }
  }

  const handleAddPerson = () => {
    if (!newPersonForm.name || !newPersonForm.subUnitId) return

    const addKey = `person-${coordinator.id}-${newPersonForm.subUnitId}-${newPersonForm.name}`
    if (addInProgressRef.current.has(addKey)) return

    addInProgressRef.current.add(addKey)

    try {
      // Duplicate kontrolü
      const subUnit = coordinator.subUnits?.find(su => su.id === newPersonForm.subUnitId)
      const existingPerson = subUnit?.people?.find(p => 
        p.name === newPersonForm.name && p.title === (newPersonForm.title || '')
      )
      
      if (!existingPerson) {
        onAddPerson(coordinator.id, newPersonForm.subUnitId, {
          name: newPersonForm.name,
          title: newPersonForm.title,
        })
        setNewPersonForm({ name: '', title: '', subUnitId: '' })
        setEditMode(null)
      }
    } finally {
      setTimeout(() => {
        addInProgressRef.current.delete(addKey)
      }, 500)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">{coordinator.title}</h2>
              <p className="text-blue-200 text-sm">{coordinator.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Koordinatör Bölümü */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Koordinatör
              </h3>
              <button
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  handleSetCoordinator();
                }}
                className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg transition-colors"
              >
                {coordinator.coordinator ? 'Düzenle' : 'Ata'}
              </button>
            </div>

            {coordinator.coordinator ? (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="font-medium text-gray-900">{coordinator.coordinator.name}</p>
                <p className="text-sm text-gray-500">{coordinator.coordinator.title}</p>
                {coordinator.responsibilities && coordinator.responsibilities.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-400 mb-1">Görevler:</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {coordinator.responsibilities.slice(0, 3).map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-yellow-500">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                      {coordinator.responsibilities.length > 3 && (
                        <li className="text-gray-400 text-xs">+{coordinator.responsibilities.length - 3} daha...</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-yellow-600 italic">Henüz koordinatör atanmadı</p>
            )}

            {/* Koordinatör Düzenleme Formu */}
            {editMode === 'coordinator' && (
              <div className="mt-3 p-3 bg-white rounded-lg border-2 border-yellow-300 space-y-3">
                <input
                  type="text"
                  placeholder="Koordinatör Adı"
                  value={editData?.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
                <input
                  type="text"
                  placeholder="Ünvan"
                  value={editData?.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
                <textarea
                  placeholder="Görevler (her satıra bir görev)"
                  value={editData?.responsibilities || ''}
                  onChange={(e) => setEditData({ ...editData, responsibilities: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveCoordinator();
                    }}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditMode(null); setEditData(null) }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Yardımcılar Bölümü */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Yardımcılar ({coordinator.deputies?.length || 0})
              </h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditMode('deputy') }}
                className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg transition-colors"
              >
                + Ekle
              </button>
            </div>

            {/* Yardımcı Ekleme Formu */}
            {editMode === 'deputy' && (
              <div className="mb-3 p-3 bg-white rounded-lg border-2 border-purple-300 space-y-3">
                <input
                  type="text"
                  placeholder="Yardımcı Adı"
                  value={newDeputyForm.name}
                  onChange={(e) => setNewDeputyForm({ ...newDeputyForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400"
                />
                <input
                  type="text"
                  placeholder="Ünvan"
                  value={newDeputyForm.title}
                  onChange={(e) => setNewDeputyForm({ ...newDeputyForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400"
                />
                <textarea
                  placeholder="Görevler (her satıra bir görev)"
                  value={newDeputyForm.responsibilities}
                  onChange={(e) => setNewDeputyForm({ ...newDeputyForm, responsibilities: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400"
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddDeputy();
                    }} 
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Ekle
                  </button>
                  <button type="button" onClick={() => setEditMode(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">İptal</button>
                </div>
              </div>
            )}

            {coordinator.deputies && coordinator.deputies.length > 0 ? (
              <div className="space-y-2">
                {coordinator.deputies.map((deputy, idx) => {
                  // Unique key oluştur - deputy.id + idx kombinasyonu
                  const uniqueKey = deputy.id ? `${deputy.id}-${idx}` : `deputy-${coordinator.id}-${idx}`
                  
                  return (
                    <div 
                      key={uniqueKey}
                      className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedPerson({
                        person: { id: deputy.id || `deputy-${idx}`, name: deputy.name, title: deputy.title },
                        coordinatorId: coordinator.id,
                        subUnitId: '',
                        type: 'deputy'
                      })}
                    >
                      <p className="font-medium text-gray-900 text-sm">{deputy.name}</p>
                      <p className="text-xs text-gray-500">{deputy.title}</p>
                      {deputy.responsibilities && deputy.responsibilities.length > 0 && (
                        <p className="text-xs text-purple-500 mt-1">{deputy.responsibilities.length} görev</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-purple-600 italic">Henüz yardımcı eklenmedi</p>
            )}
          </div>

          {/* Alt Birimler Bölümü */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Alt Birimler ({coordinator.subUnits?.length || 0})
              </h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditMode('subunit') }}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors"
              >
                + Ekle
              </button>
            </div>

            {/* Alt Birim Ekleme Formu */}
            {editMode === 'subunit' && (
              <div className="mb-3 p-3 bg-white rounded-lg border-2 border-blue-300 space-y-3">
                <input
                  type="text"
                  placeholder="Birim Adı *"
                  required
                  value={newSubUnitForm.title}
                  onChange={(e) => setNewSubUnitForm({ ...newSubUnitForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                />
                <textarea
                  placeholder="Açıklama (Birim hakkında kısa açıklama)"
                  value={newSubUnitForm.description}
                  onChange={(e) => setNewSubUnitForm({ ...newSubUnitForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                />
                <textarea
                  placeholder="Sorumluluklar / Görevler (her satıra bir sorumluluk)"
                  value={newSubUnitForm.responsibilities}
                  onChange={(e) => setNewSubUnitForm({ ...newSubUnitForm, responsibilities: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddSubUnit();
                    }} 
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Ekle
                  </button>
                  <button type="button" onClick={() => setEditMode(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">İptal</button>
                </div>
              </div>
            )}

            {coordinator.subUnits && coordinator.subUnits.length > 0 ? (
              <div className="space-y-3">
                {coordinator.subUnits.map((subUnit, idx) => {
                  // Unique key oluştur - subUnit.id + idx kombinasyonu
                  const uniqueKey = subUnit.id ? `${subUnit.id}-${idx}` : `subunit-${coordinator.id}-${idx}`
                  
                  return (
                    <div key={uniqueKey} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 text-sm">{subUnit.title}</p>
                        <button
                          onClick={() => {
                            setEditMode('person')
                            setNewPersonForm({ ...newPersonForm, subUnitId: subUnit.id })
                          }}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          + Kişi Ekle
                        </button>
                      </div>
                      
                      {/* Açıklama */}
                      {subUnit.description && subUnit.description.trim() ? (
                        <div className="mb-3 pt-2 mt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Açıklama:</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{subUnit.description}</p>
                        </div>
                      ) : null}
                      
                      {/* Görevler / Sorumluluklar */}
                      <div className="mb-3 pt-2 mt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Görevler:</p>
                          {onAddSubUnitResponsibility && (
                            <button
                              onClick={() => {
                                setNewSubUnitResponsibilityForm({ subUnitId: subUnit.id, responsibility: '' })
                                setEditMode('subunit-responsibility')
                              }}
                              className="text-xs text-blue-500 hover:text-blue-700"
                            >
                              + Görev Ekle
                            </button>
                          )}
                        </div>
                        {subUnit.responsibilities && subUnit.responsibilities.length > 0 && subUnit.responsibilities.filter(r => r && r.trim()).length > 0 ? (
                          <ul className="text-sm text-gray-700 space-y-1.5">
                            {subUnit.responsibilities.filter(r => r && r.trim()).map((resp, respIdx) => (
                              <li key={`${subUnit.id}-resp-${respIdx}`} className="flex items-start gap-2 pl-1">
                                <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
                                <span className="flex-1 leading-relaxed">{resp.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Henüz görev eklenmemiş</p>
                        )}
                        
                        {/* Görev Ekleme Formu */}
                        {editMode === 'subunit-responsibility' && newSubUnitResponsibilityForm.subUnitId === subUnit.id && onAddSubUnitResponsibility && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg space-y-2">
                            <input
                              type="text"
                              placeholder="Yeni görev ekle..."
                              value={newSubUnitResponsibilityForm.responsibility}
                              onChange={(e) => setNewSubUnitResponsibilityForm({ ...newSubUnitResponsibilityForm, responsibility: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSubUnitResponsibilityForm.responsibility.trim()) {
                                  e.preventDefault()
                                  onAddSubUnitResponsibility(coordinator.id, subUnit.id, newSubUnitResponsibilityForm.responsibility.trim())
                                  setNewSubUnitResponsibilityForm({ subUnitId: '', responsibility: '' })
                                  setEditMode(null)
                                  showToast('Görev eklendi!', 'success')
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (newSubUnitResponsibilityForm.responsibility.trim()) {
                                    onAddSubUnitResponsibility(coordinator.id, subUnit.id, newSubUnitResponsibilityForm.responsibility.trim())
                                    setNewSubUnitResponsibilityForm({ subUnitId: '', responsibility: '' })
                                    setEditMode(null)
                                    showToast('Görev eklendi!', 'success')
                                  }
                                }}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium"
                              >
                                Ekle
                              </button>
                              <button
                                onClick={() => {
                                  setNewSubUnitResponsibilityForm({ subUnitId: '', responsibility: '' })
                                  setEditMode(null)
                                }}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-medium"
                              >
                                İptal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Kişi Ekleme Formu */}
                    {editMode === 'person' && newPersonForm.subUnitId === subUnit.id && (
                      <div className="mb-2 p-2 bg-blue-50 rounded-lg space-y-2">
                        <input
                          type="text"
                          placeholder="Kişi Adı"
                          value={newPersonForm.name}
                          onChange={(e) => setNewPersonForm({ ...newPersonForm, name: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Ünvan"
                          value={newPersonForm.title}
                          onChange={(e) => setNewPersonForm({ ...newPersonForm, title: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddPerson();
                            }} 
                            className="flex-1 bg-blue-500 text-white py-1 rounded text-xs"
                          >
                            Ekle
                          </button>
                          <button type="button" onClick={() => setEditMode(null)} className="flex-1 bg-gray-200 text-gray-700 py-1 rounded text-xs">İptal</button>
                        </div>
                      </div>
                    )}

                    {/* Kişiler */}
                    {subUnit.people && subUnit.people.length > 0 ? (
                      <div className="space-y-1">
                        {subUnit.people.map((person, personIdx) => {
                          // Person için unique key oluştur
                          const personKey = person.id ? `${person.id}-${personIdx}` : `person-${subUnit.id}-${personIdx}`
                          
                          return (
                            <div
                              key={personKey}
                              className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors group"
                            onClick={() => setSelectedPerson({
                              person,
                              coordinatorId: coordinator.id,
                              subUnitId: subUnit.id,
                              type: 'subunit'
                            })}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-medium">
                                {person.name.charAt(0)}
                              </div>
                              <span className="text-sm text-gray-700">{person.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setConfirmationModal({
                                  isOpen: true,
                                  title: 'Personeli Sil',
                                  message: `"${person.name}" silinecek. Emin misiniz?`,
                                  confirmText: 'Evet, Sil',
                                  cancelText: 'İptal',
                                  type: 'danger',
                                  personToDelete: { coordinatorId: coordinator.id, subUnitId: subUnit.id, personId: person.id, personName: person.name },
                                  onConfirm: () => {
                                    setConfirmationModal(null)
                                    onDeletePerson(coordinator.id, subUnit.id, person.id)
                                    showToast(`"${person.name}" başarıyla silindi`, 'success')
                                  }
                                })
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Henüz kişi eklenmedi</p>
                    )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-blue-600 italic">Henüz alt birim eklenmedi</p>
            )}
          </div>
        </div>
      </div>

      {/* Kişi Detay Mini Kartı */}
      {selectedPerson && (
        <PersonMiniCard
          person={selectedPerson.person}
          type={selectedPerson.type}
          onClose={() => setSelectedPerson(null)}
          onUpdate={(updates) => {
            if (selectedPerson.type === 'subunit') {
              onUpdatePerson(
                selectedPerson.coordinatorId,
                selectedPerson.subUnitId,
                selectedPerson.person.id,
                updates
              )
            }
            setSelectedPerson(null)
          }}
        />
      )}

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title={confirmationModal.title}
          message={confirmationModal.message}
          confirmText={confirmationModal.confirmText}
          cancelText={confirmationModal.cancelText}
          type={confirmationModal.type}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
    </>
  )
}

// Kişi Mini Kart Bileşeni
interface PersonMiniCardProps {
  person: Person
  type: 'coordinator' | 'deputy' | 'subunit'
  onClose: () => void
  onUpdate: (updates: Partial<Person>) => void
}

function PersonMiniCard({ person, type, onClose, onUpdate }: PersonMiniCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: person.name,
    title: person.title || '',
    email: person.email || '',
    phone: person.phone || '',
    notes: person.notes || '',
    cvFileName: person.cvFileName || '',
    cvData: person.cvData || '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // person prop değişince editData'yı güncelle
  useEffect(() => {
    setEditData({
      name: person.name,
      title: person.title || '',
      email: person.email || '',
      phone: person.phone || '',
      notes: person.notes || '',
      cvFileName: person.cvFileName || '',
      cvData: person.cvData || '',
    })
    setIsEditing(false)
  }, [person])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Dosya boyutu 5MB\'dan küçük olmalıdır.', 'error')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setEditData({
          ...editData,
          cvData: reader.result as string,
          cvFileName: file.name,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    onUpdate(editData)
    setIsEditing(false)
  }

  const typeColors = {
    coordinator: 'from-yellow-500 to-orange-500',
    deputy: 'from-purple-500 to-pink-500',
    subunit: 'from-blue-500 to-cyan-500',
  }

  const typeLabels = {
    coordinator: 'Koordinatör',
    deputy: 'Yardımcı',
    subunit: 'Personel',
  }

  return (
    <div className="fixed right-[420px] top-1/2 -translate-y-1/2 w-[300px] bg-white rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${typeColors[type]} text-white p-4`}>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{typeLabels[type]}</span>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {person.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold">{person.name}</h4>
            <p className="text-sm text-white/80 mt-2">{person.title || 'Ünvan belirtilmedi'}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {!isEditing ? (
          <>
            {person.email && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-700">{person.email}</span>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-700">{person.phone}</span>
              </div>
            )}
            {person.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Notlar / Görevler</p>
                <p className="text-sm text-gray-700">{person.notes}</p>
              </div>
            )}
            {person.cvFileName && (
              <div className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded-lg">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-green-700">{person.cvFileName}</span>
                {person.cvData && (
                  <button 
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = person.cvData!
                      link.download = person.cvFileName!
                      link.click()
                    }}
                    className="ml-auto text-green-600 hover:text-green-800 text-xs font-medium"
                  >
                    İndir
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Düzenle
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ad Soyad"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Ünvan"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="email"
              placeholder="E-posta"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="tel"
              placeholder="Telefon"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <textarea
              placeholder="Notlar / Görevler"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            
            {/* CV Yükleme */}
            <div className="border-t pt-2">
              <p className="text-xs text-gray-500 mb-2">CV / Özgeçmiş</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              {editData.cvFileName ? (
                <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-green-700 flex-1 truncate">{editData.cvFileName}</span>
                  <button
                    type="button"
                    onClick={() => setEditData({ ...editData, cvFileName: '', cvData: '' })}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Sil
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 text-xs flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  CV Yükle (Max 5MB)
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                Kaydet
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
