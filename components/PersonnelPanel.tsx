'use client'

import { useState, useMemo, useEffect } from 'react'
import { Person, useOrgData } from '@/context/OrgDataContext'
import { X, Search, Users, User, UserCog, Building2, MapPin, Filter } from 'lucide-react'
import PersonDetailModal from './PersonDetailModal'
import PersonnelTransferModal from './PersonnelTransferModal'
import PersonnelContextMenu from './PersonnelContextMenu'
import ConfirmationModal from './ConfirmationModal'
import { showToast } from './Toast'

interface PersonnelItem {
  person: Person
  type: 'coordinator' | 'deputy' | 'subunit-person' | 'city-person'
  coordinatorId?: string
  coordinatorTitle?: string
  subUnitId?: string
  subUnitTitle?: string
  city?: string
  role?: 'ilSorumlusu' | 'deneyapSorumlusu' // Şehir personeli için role
}

interface PersonnelPanelProps {
  isOpen: boolean
  onClose: () => void
  personnel: PersonnelItem[]
  onPersonClick?: (person: Person, metadata: Omit<PersonnelItem, 'person'>) => void
  onPersonUpdate?: (person: Person, metadata: Omit<PersonnelItem, 'person'>, updates: Partial<Person>) => void
  onPersonMove?: (person: Person, metadata: Omit<PersonnelItem, 'person'>, toCoordinatorId: string, toSubUnitId: string) => void
  onPersonDelete?: (person: Person, metadata: Omit<PersonnelItem, 'person'>) => void
  onAddPerson?: () => void
}

export default function PersonnelPanel({ isOpen, onClose, personnel, onPersonClick, onPersonUpdate, onPersonMove, onPersonDelete, onAddPerson }: PersonnelPanelProps) {
  const { data } = useOrgData()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'coordinator' | 'deputy' | 'subunit-person' | 'city-person'>('all')
  const [selectedPerson, setSelectedPerson] = useState<{ person: Person; metadata: Omit<PersonnelItem, 'person'> } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: PersonnelItem } | null>(null)
  const [transferModal, setTransferModal] = useState<{ item: PersonnelItem } | null>(null)
  const [addPersonModal, setAddPersonModal] = useState<boolean>(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ item: PersonnelItem } | null>(null)

  // Filtreleme ve arama
  const filteredPersonnel = useMemo(() => {
    let filtered = personnel

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType)
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.person.name.toLowerCase().includes(search) ||
        p.person.title?.toLowerCase().includes(search) ||
        p.coordinatorTitle?.toLowerCase().includes(search) ||
        p.subUnitTitle?.toLowerCase().includes(search) ||
        p.city?.toLowerCase().includes(search)
      )
    }

    return filtered.sort((a, b) => a.person.name.localeCompare(b.person.name))
  }, [personnel, searchTerm, filterType])

  // İstatistikler
  const stats = useMemo(() => {
    return {
      total: personnel.length,
      coordinators: personnel.filter(p => p.type === 'coordinator').length,
      deputies: personnel.filter(p => p.type === 'deputy').length,
      subunitPersonnel: personnel.filter(p => p.type === 'subunit-person').length,
      cityPersonnel: personnel.filter(p => p.type === 'city-person').length,
    }
  }, [personnel])

  const getTypeLabel = (type: PersonnelItem['type']) => {
    switch (type) {
      case 'coordinator':
        return 'Koordinatör'
      case 'deputy':
        return 'Koordinatör Yardımcısı'
      case 'subunit-person':
        return 'Alt Birim Personeli'
      case 'city-person':
        return 'Şehir Personeli'
      default:
        return type
    }
  }

  const getTypeIcon = (type: PersonnelItem['type']) => {
    switch (type) {
      case 'coordinator':
        return <UserCog className="w-4 h-4" />
      case 'deputy':
        return <User className="w-4 h-4" />
      case 'subunit-person':
        return <Building2 className="w-4 h-4" />
      case 'city-person':
        return <MapPin className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: PersonnelItem['type']) => {
    switch (type) {
      case 'coordinator':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'deputy':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'subunit-person':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'city-person':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const handlePersonClick = (item: PersonnelItem, e?: React.MouseEvent) => {
    // Context menu açıksa tıklamayı engelle
    if (contextMenu) return
    
    if (onPersonClick) {
      const { person, ...metadata } = item
      onPersonClick(person, metadata)
    } else {
      const { person, ...metadata } = item
      setSelectedPerson({ person, metadata })
    }
  }

  const handleContextMenu = (e: React.MouseEvent, item: PersonnelItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  // Context menu kapatma
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-bold">Tüm Personel</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
              <div className="text-white/80 text-xs">Toplam</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
              <div className="text-white/80 text-xs">Koordinatörler</div>
              <div className="text-2xl font-bold">{stats.coordinators}</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
              <div className="text-white/80 text-xs">Yardımcılar</div>
              <div className="text-2xl font-bold">{stats.deputies}</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
              <div className="text-white/80 text-xs">Birim Personeli</div>
              <div className="text-2xl font-bold">{stats.subunitPersonnel}</div>
            </div>
          </div>
        </div>

        {/* Search ve Filtre */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          {/* Arama */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="İsim, ünvan, birim veya şehir ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Tip Filtresi */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tümü ({stats.total})
            </button>
            <button
              onClick={() => setFilterType('coordinator')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'coordinator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Koordinatör ({stats.coordinators})
            </button>
            <button
              onClick={() => setFilterType('deputy')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'deputy'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Yardımcı ({stats.deputies})
            </button>
            <button
              onClick={() => setFilterType('subunit-person')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'subunit-person'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Birim ({stats.subunitPersonnel})
            </button>
            {stats.cityPersonnel > 0 && (
              <button
                onClick={() => setFilterType('city-person')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterType === 'city-person'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Şehir ({stats.cityPersonnel})
              </button>
            )}
          </div>
        </div>

        {/* Personel Listesi */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Personel bulunamadı</p>
              <p className="text-sm mt-1">
                {searchTerm || filterType !== 'all' 
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'Henüz personel eklenmemiş'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPersonnel.map((item, idx) => (
                <div
                  key={`${item.type}-${item.person.id || item.person.name}-${idx}`}
                  onClick={(e) => handlePersonClick(item, e)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar/İkon */}
                    {item.person.photoData ? (
                      <img
                        src={item.person.photoData}
                        alt={item.person.name}
                        className="flex-shrink-0 w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getTypeColor(item.type)} flex items-center justify-center`}>
                        {getTypeIcon(item.type)}
                      </div>
                    )}

                    {/* Bilgiler */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                            {item.person.name}
                          </h3>
                          {item.person.title && (
                            <p className="text-sm text-gray-600 mt-0.5">{item.person.title}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getTypeColor(item.type)} whitespace-nowrap`}>
                          {item.person.title && (item.type === 'coordinator' || item.type === 'deputy' || item.type === 'subunit-person' || item.type === 'city-person')
                            ? item.person.title 
                            : getTypeLabel(item.type)}
                        </span>
                      </div>

                      {/* Lokasyon Bilgisi */}
                      <div className="mt-2 space-y-1">
                        {item.coordinatorTitle && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{item.coordinatorTitle}</span>
                          </div>
                        )}
                        {item.subUnitTitle && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 ml-4">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{item.subUnitTitle}</span>
                          </div>
                        )}
                        {item.city && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{item.city}</span>
                          </div>
                        )}
                      </div>

                      {/* Görevler önizleme */}
                      {item.person.jobDescription && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {item.person.jobDescription.split('\n').slice(0, 2).join(' | ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personel Detay Modal */}
      {selectedPerson && (
        <PersonDetailModal
          isOpen={!!selectedPerson}
          person={selectedPerson.person}
          onClose={() => setSelectedPerson(null)}
          onSave={(updates) => {
            if (selectedPerson && onPersonUpdate) {
              onPersonUpdate(selectedPerson.person, selectedPerson.metadata, updates)
            }
            setSelectedPerson(null)
          }}
        />
      )}

      {/* Context Menu */}
      <PersonnelContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        onEdit={() => {
          if (contextMenu) {
            const { person, ...metadata } = contextMenu.item
            setSelectedPerson({ person, metadata })
            setContextMenu(null)
          }
        }}
        onMove={() => {
          if (contextMenu && contextMenu.item.type === 'subunit-person') {
            setTransferModal({ item: contextMenu.item })
            setContextMenu(null)
          }
        }}
        onDelete={() => {
          if (contextMenu) {
            setDeleteConfirmation({ item: contextMenu.item })
            setContextMenu(null)
          }
        }}
        canMove={contextMenu?.item.type === 'subunit-person' && !!onPersonMove}
        canDelete={!!onPersonDelete && (contextMenu?.item.type === 'subunit-person' || contextMenu?.item.type === 'deputy' || contextMenu?.item.type === 'city-person')}
      />

      {/* Transfer Modal */}
      {transferModal && (
        <PersonnelTransferModal
          isOpen={!!transferModal}
          onClose={() => setTransferModal(null)}
          personName={transferModal.item.person.name}
          currentCoordinatorId={transferModal.item.coordinatorId}
          currentSubUnitId={transferModal.item.subUnitId}
          onTransfer={(toCoordinatorId, toSubUnitId) => {
            if (onPersonMove) {
              const { person, ...metadata } = transferModal.item
              onPersonMove(person, metadata, toCoordinatorId, toSubUnitId)
              showToast(`${person.name} başka bir birime taşındı!`, 'success')
            }
            setTransferModal(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <ConfirmationModal
          isOpen={!!deleteConfirmation}
          title="Personeli Sil"
          message={`${deleteConfirmation.item.person.name} adlı personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          confirmText="Evet, Sil"
          cancelText="İptal"
          type="danger"
          onConfirm={() => {
            if (deleteConfirmation && onPersonDelete) {
              const { person, ...metadata } = deleteConfirmation.item
              onPersonDelete(person, metadata)
              showToast(`${person.name} silindi!`, 'success')
            }
            setDeleteConfirmation(null)
          }}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </>
  )
}
