'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface UnitNodeProps {
  data: {
    label: string
    id: string
    onClick?: (id: string) => void
  }
}

const UnitNode = memo(({ data }: UnitNodeProps) => {
  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <div
        onClick={() => data.onClick?.(data.id)}
        className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-md border border-gray-200 min-w-[140px] max-w-[160px] text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-gray-300"
      >
        <div className="text-sm font-medium leading-tight">
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
    </div>
  )
})

UnitNode.displayName = 'UnitNode'

export default UnitNode
