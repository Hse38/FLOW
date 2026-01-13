'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface MainCoordinatorNodeProps {
  data: {
    label: string
    id: string
    onClick?: (id: string) => void
    onContextMenu?: (event: React.MouseEvent, id: string, type: string) => void
  }
}

const MainCoordinatorNode = memo(({ data }: MainCoordinatorNodeProps) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    data.onContextMenu?.(e, data.id, 'mainCoordinator')
  }

  // Özel node'lar için daha dikdörtgen (geniş, kısa) yap
  const isSpecialNode = data.id === 't3-vakfi-koordinatorlukleri' || 
                        data.id === 'teknofest-koordinatorlukleri' || 
                        data.id === 't3-teknofest-koordinatorlukleri'
  
  // TÜM BİRİM KOORDİNATÖR NODE'LARI AYNI BOYUTTA (özel node'lar hariç)
  const widthClass = isSpecialNode 
    ? 'min-w-[500px] max-w-[700px]' 
    : 'w-[320px]' // SABİT GENİŞLİK
  const heightClass = isSpecialNode 
    ? '' 
    : 'h-[120px]' // SABİT YÜKSEKLİK
  const paddingClass = isSpecialNode 
    ? 'px-10 py-4' 
    : 'px-6 py-4'

  return (
    <div className="relative group">
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
      <div
        onClick={() => data.onClick?.(data.id)}
        onContextMenu={handleContextMenu}
        className={`bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 ${paddingClass} rounded-xl shadow-xl border-3 border-yellow-600 ${widthClass} ${heightClass} text-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 group-hover:border-yellow-700 flex items-center justify-center`}
        style={{ borderWidth: '3px' }}
      >
        <div className="text-5xl font-bold leading-relaxed uppercase tracking-wide break-words flex items-center justify-center">
          {data.label}
        </div>
      </div>
    </div>
  )
})

MainCoordinatorNode.displayName = 'MainCoordinatorNode'

export default MainCoordinatorNode
