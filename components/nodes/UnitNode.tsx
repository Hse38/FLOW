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
      {/* 4-directional handles for full manual edge control */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!bg-gray-300 !w-2 !h-2 !border-2 !border-white"
      />
      <div
        onClick={() => data.onClick?.(data.id)}
        className="bg-white text-gray-700 px-8 py-10 rounded-lg shadow-md border border-gray-200 min-w-[260px] max-w-[380px] text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-gray-300"
      >
        <div className="text-4xl font-medium leading-relaxed break-words min-h-[80px] flex items-center justify-center">
          {data.label}
        </div>
      </div>
    </div>
  )
})

UnitNode.displayName = 'UnitNode'

export default UnitNode
