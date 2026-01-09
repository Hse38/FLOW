'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SubCoordinatorNodeProps {
  data: {
    label: string
    id: string
    onClick?: (id: string) => void
    onContextMenu?: (event: React.MouseEvent, id: string, type: string) => void
    isExpanded?: boolean
    hasDetails?: boolean
    personnelCount?: number  // Mevcut personel sayısı
    normKadro?: number       // Olması gereken personel sayısı
  }
}

const SubCoordinatorNode = memo(({ data }: SubCoordinatorNodeProps) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    data.onContextMenu?.(e, data.id, 'subCoordinator')
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
        className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />
      <div
        onClick={() => data.onClick?.(data.id)}
        onContextMenu={handleContextMenu}
        className={`bg-white text-gray-800 px-4 py-3 rounded-xl shadow-lg border min-w-[160px] max-w-[180px] text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
          data.isExpanded 
            ? 'border-blue-400 ring-2 ring-blue-200' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-xs font-semibold leading-tight flex items-center justify-center gap-1">
          {data.hasDetails && (
            data.isExpanded 
              ? <ChevronDown className="w-3 h-3 text-blue-500" />
              : <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  )
})

SubCoordinatorNode.displayName = 'SubCoordinatorNode'

export default SubCoordinatorNode
