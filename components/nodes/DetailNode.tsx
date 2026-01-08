'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface DetailNodeProps {
  data: {
    label: string
    type: 'coordinator' | 'deputy' | 'subunit' | 'responsibility'
    subtitle?: string
    people?: string[]
    responsibilities?: string[]
  }
}

const DetailNode = memo(({ data }: DetailNodeProps) => {
  if (data.type === 'coordinator') {
    return (
      <div className="bg-white border-2 border-[#3b82a0] rounded-lg px-6 py-4 shadow-lg text-center min-w-[200px]">
        <Handle type="target" position={Position.Top} className="!bg-[#3b82a0]" />
        <h3 className="text-lg font-bold text-[#3b82a0]">{data.label}</h3>
        {data.subtitle && (
          <p className="text-sm text-[#3b82a0] mt-1">{data.subtitle}</p>
        )}
        <Handle type="source" position={Position.Bottom} className="!bg-[#3b82a0]" />
      </div>
    )
  }

  if (data.type === 'deputy') {
    return (
      <div className="bg-white border-2 border-[#3b82a0] rounded-full px-5 py-3 shadow-lg text-center min-w-[180px]">
        <Handle type="target" position={Position.Top} className="!bg-[#3b82a0]" />
        <p className="text-xs text-[#3b82a0] font-medium">Koordinatör Yardımcısı</p>
        <p className="text-sm text-[#3b82a0] font-bold">{data.label}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      </div>
    )
  }

  if (data.type === 'subunit') {
    return (
      <div className="bg-white border-l-4 border-[#3b82a0] rounded-lg px-4 py-3 shadow-md min-w-[140px] max-w-[180px]">
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
        <h4 className="font-bold text-[#3b82a0] text-sm text-center mb-2">{data.label}</h4>
        
        {/* Çalışanlar */}
        {data.people && data.people.length > 0 && (
          <div className="mb-2">
            <ul className="text-xs space-y-0.5">
              {data.people.map((person, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-800">{person}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Sorumluluklar */}
        {data.responsibilities && data.responsibilities.length > 0 && (
          <div className="bg-gray-50 rounded p-2 mt-2">
            <ul className="text-[10px] text-gray-600 space-y-0.5">
              {data.responsibilities.slice(0, 2).map((resp, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <span className="text-[#3b82a0] mt-0.5">•</span>
                  <span className="line-clamp-2">{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (data.type === 'responsibility') {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-sm max-w-[280px]">
        <Handle type="target" position={Position.Top} className="!bg-[#3b82a0]" />
        <ul className="text-xs text-gray-700 space-y-1">
          {data.responsibilities?.map((resp, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[#3b82a0]">•</span>
              <span>{resp}</span>
            </li>
          ))}
        </ul>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      </div>
    )
  }

  return null
})

DetailNode.displayName = 'DetailNode'

export default DetailNode
