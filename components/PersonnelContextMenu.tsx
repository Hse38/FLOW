'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Edit, Move, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PersonnelContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onMove?: () => void
  onDelete?: () => void
  canMove?: boolean
  canDelete?: boolean
}

export default function PersonnelContextMenu({
  x,
  y,
  isOpen,
  onClose,
  onEdit,
  onMove,
  onDelete,
  canMove = false,
  canDelete = false,
}: PersonnelContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState({ x, y })

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const menuWidth = 240
      const menuHeight = 150
      const padding = 10
      
      let adjustedX = x
      let adjustedY = y

      // X pozisyonunu ayarla (ekran dışına taşmasın)
      if (x + menuWidth > window.innerWidth - padding) {
        adjustedX = window.innerWidth - menuWidth - padding
      }
      if (adjustedX < padding) {
        adjustedX = padding
      }

      // Y pozisyonunu ayarla (ekran dışına taşmasın)
      if (y + menuHeight > window.innerHeight - padding) {
        adjustedY = window.innerHeight - menuHeight - padding
      }
      if (adjustedY < padding) {
        adjustedY = padding
      }

      setMenuPosition({ x: adjustedX, y: adjustedY })
    }
  }, [isOpen, x, y])

  if (!isOpen) return null

  const menuItems = [
    {
      label: 'Düzenle',
      icon: Edit,
      onClick: onEdit,
      show: true,
    },
    {
      label: 'Birim/Koordinatörlük Değiştir',
      icon: Move,
      onClick: onMove,
      show: canMove && !!onMove,
    },
    {
      label: 'Sil',
      icon: Trash2,
      onClick: onDelete,
      show: canDelete && !!onDelete,
      danger: true,
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
        onClick={onClose}
      />
      
      {/* Menu */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[60] bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[240px]"
          style={{ 
            left: menuPosition.x, 
            top: menuPosition.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, index) => {
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
