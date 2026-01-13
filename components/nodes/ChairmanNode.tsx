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
        id="top"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-12 py-5 rounded-lg shadow-xl border-2 border-yellow-300 min-w-[400px] max-w-[500px] text-center transition-all duration-300 hover:shadow-2xl hover:scale-105">
        <div className="text-4xl font-bold tracking-wide leading-relaxed break-words">{data.label}</div>
        {data.title && (
          <div className="text-3xl text-yellow-800 mt-1 font-semibold leading-relaxed break-words">{data.title}</div>
        )}
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

ChairmanNode.displayName = 'ChairmanNode'

export default ChairmanNode
