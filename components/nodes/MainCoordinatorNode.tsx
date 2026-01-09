'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface MainCoordinatorNodeProps {
  data: {
    label: string
    id: string
    onClick?: (id: string) => void
    onContextMenu?: (event: React.MouseEvent, id: string, type: string) => void
  }
}

const MainCoordinatorNode = memo(({ data }: MainCoordinatorNodeProps) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    data.onContextMenu?.(e, data.id, 'mainCoordinator')
  }

  return (
    <div className="relative group">
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
