'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface ChairmanNodeProps {
  data: {
    label: string
    title?: string
    onVideoClick?: () => void
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
      <div 
        onClick={(e) => {
          // Sol tık ile video aç (sağ tık menü için engelleme)
          if (e.button === 0 && data.onVideoClick) {
            e.stopPropagation()
            data.onVideoClick()
          }
        }}
        className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-8 py-4 rounded-lg shadow-xl border-2 border-yellow-300 min-w-[200px] text-center transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer"
      >
        <div className="text-lg font-bold tracking-wide">{data.label}</div>
        <div className="text-xs text-yellow-800 mt-1 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Video için tıkla
        </div>
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
