'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, ListChecks, UserPlus, Trash2, Edit, ChevronRight } from 'lucide-react'

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
  onEdit: () => void
  onDelete: () => void
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
  onEdit,
  onDelete,
}: ContextMenuProps) {
  if (!isOpen) return null

  const menuItems = [
    {
      label: 'Alt Birim Ekle',
      icon: Plus,
      onClick: onAddSubCoordinator,
      show: ['coordinator', 'mainCoordinator', 'subCoordinator'].includes(nodeType),
    },
    {
      label: 'Yardımcı Ekle',
      icon: UserPlus,
      onClick: onAddDeputy,
      show: ['coordinator', 'subCoordinator'].includes(nodeType),
    },
    {
      label: 'Görev/Sorumluluk Ekle',
      icon: ListChecks,
      onClick: onAddResponsibility,
      show: true,
    },
    {
      label: 'Kişi Ekle',
      icon: Users,
      onClick: onAddPerson,
      show: ['coordinator', 'subCoordinator', 'subunit'].includes(nodeType),
    },
    { type: 'divider' },
    {
      label: 'Düzenle',
      icon: Edit,
      onClick: onEdit,
      show: true,
    },
    {
      label: 'Sil',
      icon: Trash2,
      onClick: onDelete,
      show: !['chairman', 'executive'].includes(nodeType),
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
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
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
