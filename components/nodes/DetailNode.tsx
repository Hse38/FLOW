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
    deputyId?: string // Deputy ID'si
  }
}

const DetailNode = memo(({ data }: DetailNodeProps) => {
  if (data.type === 'coordinator') {
    return (
      <div
        className="bg-white border-2 border-[#3b82a0] rounded-lg px-10 py-4 shadow-lg text-center min-w-[400px] max-w-[600px] cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          if (data.onPersonClick) {
            // onPersonClick callback'i zaten tam person objesini oluşturuyor
            // Burada sadece placeholder bir obje gönderiyoruz, callback içinde doğru obje oluşturulacak
            data.onPersonClick({ id: 'coordinator', name: data.label || '', title: data.subtitle || '' } as any)
          }
        }}
      >
        {/* 4-directional handles for full manual edge control */}
        <Handle type="target" position={Position.Top} id="top" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Right} id="right" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-[#3b82a0]" />
        <Handle type="source" position={Position.Top} id="top-source" className="!bg-[#3b82a0]" />
        <Handle type="source" position={Position.Right} id="right-source" className="!bg-[#3b82a0]" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-[#3b82a0]" />
        <Handle type="source" position={Position.Left} id="left-source" className="!bg-[#3b82a0]" />
        <h3 className="text-4xl font-bold text-[#3b82a0]">{data.label}</h3>
        {data.subtitle && (
          <p className="text-3xl text-[#3b82a0] mt-1 font-semibold">{data.subtitle}</p>
        )}
      </div>
    )
  }

  if (data.type === 'deputy') {
    return (
      <div
        className="bg-white border-2 border-[#3b82a0] rounded-full px-7 py-5 shadow-lg text-center min-w-[220px] cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          if (data.onPersonClick) {
            data.onPersonClick({ id: 'self', name: data.label, title: data.subtitle || '' } as any)
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (data.onPersonContextMenu && data.deputyId && data.coordinatorId) {
            // Deputy için doğru person objesi oluştur
            const deputyPerson = { 
              id: data.deputyId, 
              name: data.label, 
              title: data.subtitle || '' 
            } as Person
            data.onPersonContextMenu(e, deputyPerson)
          }
        }}
      >
        {/* 4-directional handles for full manual edge control */}
        <Handle type="target" position={Position.Top} id="top" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Right} id="right" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-[#3b82a0]" />
        <Handle type="source" position={Position.Top} id="top-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Right} id="right-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Left} id="left-source" className="!bg-gray-400" />
        {data.subtitle && data.subtitle.trim() ? (
          <p className="text-xl text-blue-600 font-medium opacity-80">{data.subtitle}</p>
        ) : (
          <p className="text-xl text-blue-600 font-medium opacity-80">Koordinatör Yardımcısı</p>
        )}
        <p className="text-3xl text-[#3b82a0] font-bold">{data.label}</p>
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
        className="bg-white border-l-4 border-[#3b82a0] rounded-lg px-8 py-4 shadow-md min-w-[400px] max-w-[600px] relative"
        onContextMenu={data.onContextMenu}
      >
        {/* 4-directional handles for full manual edge control */}
        <Handle type="target" position={Position.Top} id="top" className="!bg-gray-400" />
        <Handle type="target" position={Position.Right} id="right" className="!bg-gray-400" />
        <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-gray-400" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-gray-400" />
        <Handle type="source" position={Position.Top} id="top-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Right} id="right-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Left} id="left-source" className="!bg-gray-400" />
        <h4 className="font-bold text-[#3b82a0] text-4xl text-center mb-4">{data.label}</h4>

        {/* Çalışanlar - Üstte - AYRI BÖLÜM */}
        {data.people && data.people.length > 0 && (
          <div className="mb-4 pb-4 border-b-2 border-gray-300">
            {/* Personel Başlığı */}
            <div className="mb-2">
              <h5 className="text-3xl font-semibold text-gray-600 mb-2">Personel</h5>
            </div>
            <ul className="text-4xl space-y-2">
              {data.people.map((person, personIdx) => {
                // Unique key oluştur - person.id + idx kombinasyonu
                const personKey = person.id ? `${person.id}-${personIdx}` : `person-${data.subUnitId || 'subunit'}-${personIdx}`
                
                return (
                  <li
                    key={personKey}
                    className={`flex items-center gap-2 nodrag nopan ${data.onPersonClick ? 'cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors' : ''}`}
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
                    <span className="text-blue-500 font-bold text-2xl">•</span>
                    <span className="text-gray-800 font-medium">{person.name}</span>
                    {person.cvFileName && (
                      <span className="text-green-500 text-[10px]" title="CV yüklü">📄</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Görevler / Sorumluluklar - Altta - AYRI BÖLÜM */}
        {(() => {
          const validResponsibilities = Array.isArray(data.responsibilities) 
            ? data.responsibilities.filter(r => r && String(r).trim()) 
            : []
          
          return validResponsibilities.length > 0 ? (
            <div className="mt-2">
              {/* Görevler Başlığı */}
              <div className="mb-2">
                <h5 className="text-3xl font-semibold text-gray-600 mb-2">Görevler</h5>
              </div>
              <ul className="text-4xl text-gray-800 space-y-2.5">
                {validResponsibilities.map((resp, idx) => {
                  // Unique key oluştur - resp içeriği + idx kombinasyonu
                  const respKey = data.subUnitId 
                    ? `resp-${data.subUnitId}-${idx}-${String(resp).slice(0, 10).replace(/\s/g, '')}` 
                    : `resp-${idx}-${String(resp).slice(0, 10).replace(/\s/g, '')}`
                  
                  return (
                    <li key={respKey} className="flex items-start gap-2">
                      <span className="text-[#3b82a0] mt-0.5 flex-shrink-0 font-bold text-2xl">•</span>
                      <span className="leading-relaxed text-gray-700">{String(resp).trim()}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null
        })()}
      </div>
    )
  }

  if (data.type === 'responsibility') {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-sm max-w-[280px]">
        {/* 4-directional handles for full manual edge control */}
        <Handle type="target" position={Position.Top} id="top" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Right} id="right" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-[#3b82a0]" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-[#3b82a0]" />
        <Handle type="source" position={Position.Top} id="top-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Right} id="right-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-gray-400" />
        <Handle type="source" position={Position.Left} id="left-source" className="!bg-gray-400" />
        <ul className="text-base text-gray-700 space-y-1">
          {data.responsibilities?.map((resp, idx) => {
            // Unique key oluştur - resp içeriği + idx kombinasyonu
            const respKey = `responsibility-${idx}-${resp.slice(0, 15).replace(/\s/g, '')}`
            
            return (
              <li key={respKey} className="flex items-start gap-2">
                <span className="text-[#3b82a0]">•</span>
                <span>{resp}</span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (data.type === 'person') {
    return (
      <div
        className="bg-white border text-gray-800 px-5 py-3 rounded-xl shadow-md border-gray-200 min-w-[200px] max-w-[280px] text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300 relative group"
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
        {/* 4-directional handles for full manual edge control */}
        <Handle type="target" position={Position.Top} id="top" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="target" position={Position.Right} id="right" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="source" position={Position.Top} id="top-source" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="source" position={Position.Right} id="right-source" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <Handle type="source" position={Position.Left} id="left-source" className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg mb-1">
            {data.label.charAt(0)}
          </div>
          <div className="text-3xl font-semibold leading-tight">{data.label}</div>
          {data.subtitle && <div className="text-2xl text-gray-500 mt-2">{data.subtitle}</div>}
        </div>
      </div>
    )
  }

  return null
})

DetailNode.displayName = 'DetailNode'

export default DetailNode
