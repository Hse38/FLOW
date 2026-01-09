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
  }
}

const SubCoordinatorNode = memo(({ data }: SubCoordinatorNodeProps) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    data.onContextMenu?.(e, data.id, 'subCoordinator')
  }

  return (
    <div className="relative group">
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
