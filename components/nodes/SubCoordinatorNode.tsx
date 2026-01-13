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

  // Özel node'lar için daha dikdörtgen (geniş, kısa) yap
  const isSpecialNode = data.id === 't3-vakfi-koordinatorlukleri' || 
                        data.id === 'teknofest-koordinatorlukleri' || 
                        data.id === 't3-teknofest-koordinatorlukleri'
  
  const widthClass = isSpecialNode 
    ? 'min-w-[500px] max-w-[700px]' 
    : 'min-w-[220px] max-w-[320px]'
  const paddingClass = isSpecialNode 
    ? 'px-10 py-4' 
    : 'px-6 py-6'

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
        className={`bg-white text-gray-800 ${paddingClass} rounded-xl shadow-lg border ${widthClass} text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
          data.isExpanded 
            ? 'border-blue-400 ring-2 ring-blue-200' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-4xl font-semibold leading-relaxed flex items-center justify-center gap-1 break-words">
          {data.hasDetails && (
            data.isExpanded 
              ? <ChevronDown className="w-5 h-5 text-blue-500" />
              : <ChevronRight className="w-5 h-5 text-gray-400" />
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
