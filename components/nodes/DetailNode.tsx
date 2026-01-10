'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface Person {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  notes?: string
  cvFileName?: string
  cvData?: string
}

interface DetailNodeProps {
  data: {
    label: string
    type: 'coordinator' | 'deputy' | 'subunit' | 'responsibility' | 'person'
    subtitle?: string
    people?: Person[]
    responsibilities?: string[]
    onPersonClick?: (person: Person) => void
    onPersonContextMenu?: (e: React.MouseEvent, person: Person) => void
    onContextMenu?: (e: React.MouseEvent) => void
    coordinatorId?: string
    subUnitId?: string
  }
}

const DetailNode = memo(({ data }: DetailNodeProps) => {
  if (data.type === 'coordinator') {
    return (
      <div
        className="bg-white border-2 border-[#3b82a0] rounded-lg px-6 py-4 shadow-lg text-center min-w-[200px] cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          if (data.onPersonClick) {
            data.onPersonClick({ id: 'self', name: data.label, title: data.subtitle } as any)
          }
        }}
      >
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
      <div
        className="bg-white border-2 border-[#3b82a0] rounded-full px-5 py-3 shadow-lg text-center min-w-[180px] cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          if (data.onPersonClick) {
            data.onPersonClick({ id: 'self', name: data.label, title: 'Koordinatör Yardımcısı' } as any)
          }
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-[#3b82a0]" />
        <p className="text-xs text-blue-600 font-medium opacity-80">Koordinatör Yardımcısı</p>
        <p className="text-sm text-[#3b82a0] font-bold">{data.label}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      </div>
    )
  }

  if (data.type === 'subunit') {
    const handlePersonClick = (e: React.MouseEvent, person: Person) => {
      e.preventDefault()
      e.stopPropagation()
      if (data.onPersonClick) {
        data.onPersonClick(person)
      }
    }

    return (
      <div
        className="bg-white border-l-4 border-[#3b82a0] rounded-lg px-4 py-3 shadow-md min-w-[140px] max-w-[180px] relative"
        onContextMenu={data.onContextMenu}
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
        <h4 className="font-bold text-[#3b82a0] text-sm text-center mb-2">{data.label}</h4>

        {/* Çalışanlar */}
        {data.people && data.people.length > 0 && (
          <div className="mb-2">
            <ul className="text-xs space-y-0.5">
              {data.people.map((person) => (
                <li
                  key={person.id}
                  className={`flex items-center gap-1 nodrag nopan ${data.onPersonClick ? 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors' : ''}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => handlePersonClick(e, person)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (data.onPersonContextMenu) {
                      data.onPersonContextMenu(e, person)
                    }
                  }}
                >
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-800">{person.name}</span>
                  {person.cvFileName && (
                    <span className="text-green-500 text-[10px]" title="CV yüklü">📄</span>
                  )}
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

  if (data.type === 'person') {
    return (
      <div
        className="bg-white border text-gray-800 px-4 py-3 rounded-xl shadow-md border-gray-200 min-w-[160px] max-w-[180px] text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300 relative group"
        onClick={(e) => {
          e.stopPropagation()
          if (data.onPersonClick && data.people && data.people.length > 0) {
            data.onPersonClick(data.people[0])
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (data.onPersonContextMenu && data.people && data.people.length > 0) {
            data.onPersonContextMenu(e, data.people[0])
          }
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg mb-1">
            {data.label.charAt(0)}
          </div>
          <div className="text-sm font-semibold leading-tight">{data.label}</div>
          {data.subtitle && <div className="text-xs text-gray-500">{data.subtitle}</div>}
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
      </div>
    )
  }

  return null
})

DetailNode.displayName = 'DetailNode'

export default DetailNode
