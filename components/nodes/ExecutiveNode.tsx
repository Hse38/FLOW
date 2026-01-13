'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface ExecutiveNodeProps {
  data: {
    label: string
    title?: string
    type?: string
    id?: string // ID'yi de al (renk kontrolü için)
  }
}

const ExecutiveNode = memo(({ data }: ExecutiveNodeProps) => {
  const isSpecial = data.type === 'special'
  // ID'ye göre kontrol et (daha güvenilir - label değişse bile çalışır)
  const isToplumsal = data.id === 'toplumsal-calismalar' || data.label?.toLowerCase().includes('toplumsal')
  const isKure = data.id === 'kure-koordinatorlugu' || data.label?.toLowerCase().includes('küre') || data.label?.toLowerCase().includes('kure')
  const isBlue = isToplumsal || isKure
  
  return (
    <div className="relative">
      {/* 4-directional handles for full manual edge control */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={`!w-3 !h-3 !border-2 !border-white ${isBlue ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <div className={`${isBlue
        ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 rounded-xl'
        : isSpecial 
        ? 'bg-gradient-to-br from-rose-500 to-rose-700 border-rose-400 rounded-xl' 
        : 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400 rounded-lg'
      } text-white px-8 py-6 shadow-xl border-2 w-[600px] h-[300px] text-center transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center justify-center`}>
        <div className="font-bold text-5xl leading-relaxed break-words flex items-center justify-center">
          {data.label}
        </div>
      </div>
    </div>
  )
})

ExecutiveNode.displayName = 'ExecutiveNode'

export default ExecutiveNode
