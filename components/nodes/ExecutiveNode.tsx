'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface ExecutiveNodeProps {
  data: {
    label: string
    title?: string
    type?: string
  }
}

const ExecutiveNode = memo(({ data }: ExecutiveNodeProps) => {
  const isSpecial = data.type === 'special'
  const isToplumsal = data.label?.includes('Toplumsal Çalışmalar')
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`!w-3 !h-3 !border-2 !border-white ${isToplumsal ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
      <div className={`${isToplumsal
        ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 rounded-xl'
        : isSpecial 
        ? 'bg-gradient-to-br from-rose-500 to-rose-700 border-rose-400 rounded-xl' 
        : 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400 rounded-lg'
      } text-white px-6 py-3 shadow-xl border-2 min-w-[180px] text-center transition-all duration-300 hover:shadow-2xl hover:scale-105`}>
        <div className={`font-bold ${isSpecial || isToplumsal ? 'text-sm leading-tight' : 'text-base'}`}>
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`!w-3 !h-3 !border-2 !border-white ${isToplumsal ? '!bg-blue-500' : '!bg-rose-500'}`}
      />
    </div>
  )
})

ExecutiveNode.displayName = 'ExecutiveNode'

export default ExecutiveNode
