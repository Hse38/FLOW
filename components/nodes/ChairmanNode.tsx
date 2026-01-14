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
      {/* 4-directional handles for full manual edge control */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-12 py-6 rounded-lg shadow-xl border-2 border-yellow-300 w-[610px] h-[310px] text-center transition-all duration-300 hover:shadow-2xl hover:scale-105 flex flex-col items-center justify-center">
        <div className="text-7xl font-bold tracking-wide leading-relaxed break-words">{data.label}</div>
        {data.title && (
          <div className="text-5xl text-yellow-800 mt-2 font-semibold leading-relaxed break-words">{data.title}</div>
        )}
      </div>
    </div>
  )
})

ChairmanNode.displayName = 'ChairmanNode'

export default ChairmanNode
