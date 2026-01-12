'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, ListChecks, UserPlus, Trash2, Edit, Link2, Building2, User, Briefcase, Cable, Unlink } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  nodeId: string
  nodeType: string
  onAddSubCoordinator: () => void
  onAddDeputy: () => void
  onAddResponsibility: () => void
  onAddPerson: () => void
  onAssignPerson?: () => void // Personel Ata - mevcut personeli birime atamak için
  onEdit: () => void
  onDelete: () => void
  onLinkToMainSchema?: () => void
  isInNewSchema?: boolean
  // Yeni: Hiyerarşik ekleme
  onAddExecutive?: () => void
  onAddMainCoordinator?: () => void
  onAddCoordinator?: () => void
  onAddCoordinatorPerson?: () => void // Koordinatörlüğe koordinatör kişisi eklemek için
  // Yeni: Bağlantı oluşturma
  onStartConnection?: () => void
  hasConnections?: boolean
  onShowConnections?: () => void
}

export default function ContextMenu({
  x,
  y,
  isOpen,
  onClose,
  nodeId,
  nodeType,
  onAddSubCoordinator,
  onAddDeputy,
  onAddResponsibility,
  onAddPerson,
  onAssignPerson,
  onEdit,
  onDelete,
  onLinkToMainSchema,
  isInNewSchema = false,
  onAddExecutive,
  onAddMainCoordinator,
  onAddCoordinator,
  onAddCoordinatorPerson,
  onStartConnection,
  hasConnections,
  onShowConnections,
}: ContextMenuProps) {
  if (!isOpen) return null

  const menuItems = [
    // Hiyerarşik Ekleme - Chairman altına Executive
    {
      label: 'Genel Müdür Yardımcısı Ekle',
      icon: Briefcase,
      onClick: onAddExecutive,
      show: nodeType === 'chairman' && !!onAddExecutive,
      special: true,
    },
    // Executive altına Main Coordinator
    {
      label: 'Ana Koordinatörlük Ekle',
      icon: Building2,
      onClick: onAddMainCoordinator,
      show: nodeType === 'executive' && !!onAddMainCoordinator,
      special: true,
    },
    // Main Coordinator altına Coordinator (alt koordinatörlük)
    {
      label: 'Koordinatörlük Ekle',
      icon: Users,
      onClick: onAddCoordinator,
      show: nodeType === 'mainCoordinator' && !!onAddCoordinator,
      special: true,
    },
    // Coordinator'a koordinatör ekle (coordinator.name) - En üstte, önemli
    {
      label: 'Koordinatör Ekle',
      icon: User,
      onClick: onAddCoordinatorPerson,
      show: (nodeType === 'coordinator' || nodeType === 'subCoordinator') && !!onAddCoordinatorPerson,
      special: true,
    },
    // Coordinator altına Yardımcı ekle
    {
      label: 'Koordinatör Yardımcısı Ekle',
      icon: UserPlus,
      onClick: onAddDeputy,
      show: ['coordinator', 'subCoordinator'].includes(nodeType),
    },
    // Coordinator altına SubUnit
    {
      label: 'Alt Birim Ekle',
      icon: Plus,
      onClick: onAddSubCoordinator,
      show: ['coordinator', 'subCoordinator'].includes(nodeType),
    },
    {
      label: 'Görev/Sorumluluk Ekle',
      icon: ListChecks,
      onClick: onAddResponsibility,
      show: ['coordinator', 'subCoordinator', 'mainCoordinator'].includes(nodeType),
    },
    {
      label: 'Kişi Ekle (Birime)',
      icon: User,
      onClick: onAddPerson,
      show: ['coordinator', 'subCoordinator'].includes(nodeType),
    },
    {
      label: 'Personel Ata',
      icon: UserPlus,
      onClick: onAssignPerson,
      show: ['coordinator', 'subCoordinator'].includes(nodeType) && !!onAssignPerson,
    },
    { type: 'divider' },
    // Bağlantı oluşturma
    {
      label: 'Bağlantı Oluştur (İp Çek)',
      icon: Cable,
      onClick: onStartConnection,
      show: !!onStartConnection,
      special: true,
    },
    {
      label: 'Bağlantıları Göster/Kaldır',
      icon: Unlink,
      onClick: onShowConnections,
      show: hasConnections && !!onShowConnections,
      danger: false,
    },
    { type: 'divider' },
    {
      label: 'Düzenle',
      icon: Edit,
      onClick: onEdit,
      show: true,
    },
    {
      label: 'Ana Şemaya Bağla',
      icon: Link2,
      onClick: onLinkToMainSchema,
      show: isInNewSchema && ['coordinator', 'subCoordinator', 'mainCoordinator'].includes(nodeType),
      special: true,
    },
    {
      label: 'Sil',
      icon: Trash2,
      onClick: onDelete,
      show: true,
      danger: true,
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      
      {/* Menu */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px]"
          style={{ left: x, top: y }}
        >
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={index} className="my-2 border-t border-gray-200" />
            }
            
            if (!item.show) return null

            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  item.danger ? 'text-red-600 hover:bg-red-50' : 
                  item.special ? 'text-indigo-600 hover:bg-indigo-50' : 
                  'text-gray-700'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
