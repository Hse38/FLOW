'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface MainCoordinatorNodeProps {
  data: {
    label: string
    id: string
    onClick?: (id: string) => void
    onContextMenu?: (event: React.MouseEvent, id: string, type: string) => void
    personnelCount?: number  // Mevcut personel sayısı
    normKadro?: number       // Olması gereken personel sayısı
  }
}

const MainCoordinatorNode = memo(({ data }: MainCoordinatorNodeProps) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    data.onContextMenu?.(e, data.id, 'mainCoordinator')
  }

  // Badge renk hesaplama
  const getBadgeColor = () => {
    const current = data.personnelCount || 0
    const target = data.normKadro || 0
    if (target === 0) return current > 0 ? 'bg-blue-500' : 'bg-gray-400'
    const ratio = current / target
    if (ratio >= 1) return 'bg-green-500'
    if (ratio >= 0.5) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="relative group">
      {/* Personel sayısı badge - her zaman göster */}
      <div 
        className={`absolute -top-2 -right-2 z-10 ${getBadgeColor()} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md border border-white min-w-[32px] text-center`}
      >
        {data.personnelCount || 0}/{data.normKadro || 0}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div
        onClick={() => data.onClick?.(data.id)}
        onContextMenu={handleContextMenu}
        className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-6 py-4 rounded-xl shadow-xl border-3 border-yellow-600 min-w-[220px] text-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 group-hover:border-yellow-700"
        style={{ borderWidth: '3px' }}
      >
        <div className="text-sm font-bold leading-tight uppercase tracking-wide">
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
})

MainCoordinatorNode.displayName = 'MainCoordinatorNode'

export default MainCoordinatorNode
