'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface ChairmanNodeProps {
  data: {
    label: string
    title?: string
  }
}

const ChairmanNode = memo(({ data }: ChairmanNodeProps) => {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-8 py-4 rounded-lg shadow-xl border-2 border-yellow-300 min-w-[200px] text-center transition-all duration-300 hover:shadow-2xl hover:scale-105">
        <div className="text-lg font-bold tracking-wide">{data.label}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
})

ChairmanNode.displayName = 'ChairmanNode'

export default ChairmanNode
