'use client'

import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionMode,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import ChairmanNode from './nodes/ChairmanNode'
import ExecutiveNode from './nodes/ExecutiveNode'
import MainCoordinatorNode from './nodes/MainCoordinatorNode'
import SubCoordinatorNode from './nodes/SubCoordinatorNode'
import UnitNode from './nodes/UnitNode'
import DetailNode from './nodes/DetailNode'
import ContextMenu from './ContextMenu'
import FormModal from './FormModal'
import { useOrgData } from '@/context/OrgDataContext'

const nodeTypes = {
  chairman: ChairmanNode,
  executive: ExecutiveNode,
  mainCoordinator: MainCoordinatorNode,
  subCoordinator: SubCoordinatorNode,
  unit: UnitNode,
  detail: DetailNode,
}

interface OrgCanvasProps {
  onNodeClick?: (nodeId: string, nodeType: string) => void
}

const OrgCanvasInner = ({ onNodeClick }: OrgCanvasProps) => {
  const { data, addSubUnit, addDeputy, addResponsibility, addCoordinator, deleteCoordinator, updateCoordinator } = useOrgData()
  
  const [expandedCoordinator, setExpandedCoordinator] = useState<string | null>(null)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
    nodeType: string
  } | null>(null)
  
  // Form modal state
  const [formModal, setFormModal] = useState<{
    isOpen: boolean
    type: 'subunit' | 'deputy' | 'responsibility' | 'person' | 'edit'
    title: string
    nodeId: string
    initialData?: any
  } | null>(null)

  // Handler using ref to avoid stale closures
  const handleUnitClickRef = useRef<(unitId: string) => void>(() => {})

  handleUnitClickRef.current = (unitId: string) => {
    const coordinator = data.coordinators.find((c) => c.id === unitId)
    const mainCoord = data.mainCoordinators.find((m) => m.id === unitId)
    
    const item = coordinator || mainCoord
    if (item) {
      // Check if has detail - toggle expand
      if (coordinator && (coordinator.deputies?.length > 0 || coordinator.subUnits?.length > 0 || coordinator.hasDetailPage)) {
        setExpandedCoordinator(prev => prev === unitId ? null : unitId)
      }
      onNodeClick?.(unitId, 'unit')
    }
  }

  // Right click handler
  const handleContextMenu = useCallback((event: React.MouseEvent, nodeId: string, nodeType: string) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId,
      nodeType,
    })
  }, [])

  const handleUnitClick = useCallback((unitId: string) => {
    handleUnitClickRef.current(unitId)
  }, [])

  // Handle right click on node
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    handleContextMenu(event, node.id, node.type || 'unknown')
  }, [handleContextMenu])

  // Get expanded coordinator data
  const expandedCoordinatorData = useMemo(() => {
    if (!expandedCoordinator) return null
    return data.coordinators.find((c) => c.id === expandedCoordinator)
  }, [expandedCoordinator, data.coordinators])

  // Convert data to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    const nodeList: Node[] = []

    // Add chairman
    data.management.forEach((item) => {
      nodeList.push({
        id: item.id,
        type: 'chairman',
        position: item.position,
        data: {
          label: item.name,
          title: item.title,
        },
      })
    })

    // Add executives
    data.executives.forEach((exec) => {
      nodeList.push({
        id: exec.id,
        type: 'executive',
        position: exec.position,
        data: {
          label: exec.name,
          title: exec.title,
          type: exec.type,
        },
      })
    })

    // Add main coordinators
    data.mainCoordinators.forEach((coord) => {
      nodeList.push({
        id: coord.id,
        type: 'mainCoordinator',
        position: coord.position,
        data: {
          label: coord.title,
          id: coord.id,
          onClick: handleUnitClick,
          onContextMenu: handleContextMenu,
        },
      })
    })

    // Add sub-coordinators
    data.coordinators.forEach((coord) => {
      const hasDetails = (coord.deputies?.length || 0) > 0 || (coord.subUnits?.length || 0) > 0
      nodeList.push({
        id: coord.id,
        type: 'subCoordinator',
        position: coord.position,
        data: {
          label: coord.title,
          id: coord.id,
          onClick: handleUnitClick,
          onContextMenu: handleContextMenu,
          isExpanded: expandedCoordinator === coord.id,
          hasDetails,
        },
      })
    })

    // If a coordinator is expanded, add detail nodes
    if (expandedCoordinatorData) {
      const baseX = expandedCoordinatorData.position.x
      const baseY = expandedCoordinatorData.position.y + 100

      // Koordinatör node
      nodeList.push({
        id: 'detail-coordinator',
        type: 'detail',
        position: { x: baseX - 50, y: baseY },
        data: {
          label: expandedCoordinatorData.title,
          type: 'coordinator',
          subtitle: expandedCoordinatorData.coordinator?.name,
        },
      })

      // Sorumluluklar node
      if (expandedCoordinatorData.responsibilities?.length > 0) {
        nodeList.push({
          id: 'detail-responsibilities',
          type: 'detail',
          position: { x: baseX - 50, y: baseY + 100 },
          data: {
            label: 'Sorumluluklar',
            type: 'responsibility',
            responsibilities: expandedCoordinatorData.responsibilities,
          },
        })
      }

      // Deputy nodes
      expandedCoordinatorData.deputies?.forEach((deputy, idx) => {
        const xOffset = expandedCoordinatorData.deputies!.length === 1 ? 0 : 
                        idx === 0 ? -150 : 150
        nodeList.push({
          id: `detail-deputy-${idx}`,
          type: 'detail',
          position: { x: baseX + xOffset - 50, y: baseY + 220 },
          data: {
            label: deputy.name,
            type: 'deputy',
          },
        })
      })

      // Sub-unit nodes
      expandedCoordinatorData.subUnits?.forEach((subUnit, idx) => {
        const cols = Math.min(expandedCoordinatorData.subUnits!.length, 3)
        const col = idx % cols
        const row = Math.floor(idx / cols)
        const totalWidth = (cols - 1) * 200
        const xOffset = (col * 200) - (totalWidth / 2)
        const yOffset = row * 200
        
        nodeList.push({
          id: `detail-subunit-${idx}`,
          type: 'detail',
          position: { x: baseX + xOffset - 50, y: baseY + 340 + yOffset },
          data: {
            label: subUnit.title,
            type: 'subunit',
            people: subUnit.people?.map((p) => p.name),
            responsibilities: subUnit.responsibilities,
          },
        })
      })
    }

    return nodeList
  }, [data, handleUnitClick, handleContextMenu, expandedCoordinator, expandedCoordinatorData])

  // Convert data to React Flow edges
  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = []

    // Chairman to executives
    data.executives.forEach((exec) => {
      if (exec.parent) {
        edgeList.push({
          id: `${exec.parent}-${exec.id}`,
          source: exec.parent,
          target: exec.id,
          type: 'smoothstep',
          style: { stroke: '#ffffff', strokeWidth: 2.5 },
        })
      }
    })

    // Executives to main coordinators
    data.mainCoordinators.forEach((coord) => {
      if (coord.parent) {
        edgeList.push({
          id: `${coord.parent}-${coord.id}`,
          source: coord.parent,
          target: coord.id,
          type: 'smoothstep',
          style: { stroke: '#ffffff', strokeWidth: 2.5 },
        })
      }
    })

    // Main coordinators to sub-coordinators
    data.coordinators.forEach((coord) => {
      if (coord.parent) {
        edgeList.push({
          id: `${coord.parent}-${coord.id}`,
          source: coord.parent,
          target: coord.id,
          type: 'smoothstep',
          style: { stroke: '#ffffff', strokeWidth: 2 },
        })
      }
    })

    // Detail edges if expanded
    if (expandedCoordinatorData) {
      // Main to coordinator detail
      edgeList.push({
        id: 'detail-main-to-coord',
        source: expandedCoordinator!,
        target: 'detail-coordinator',
        type: 'smoothstep',
        style: { stroke: '#3b82a0', strokeWidth: 2 },
      })

      // Coordinator to responsibilities
      if (expandedCoordinatorData.responsibilities?.length > 0) {
        edgeList.push({
          id: 'detail-coord-to-resp',
          source: 'detail-coordinator',
          target: 'detail-responsibilities',
          type: 'smoothstep',
          style: { stroke: '#3b82a0', strokeWidth: 2 },
        })
      }

      // Responsibilities to deputies
      expandedCoordinatorData.deputies?.forEach((_, idx) => {
        edgeList.push({
          id: `detail-resp-to-deputy-${idx}`,
          source: expandedCoordinatorData.responsibilities?.length > 0 ? 'detail-responsibilities' : 'detail-coordinator',
          target: `detail-deputy-${idx}`,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })

      // Deputies to sub-units
      const deputyCount = expandedCoordinatorData.deputies?.length || 0
      expandedCoordinatorData.subUnits?.forEach((_, idx) => {
        let sourceId = 'detail-coordinator'
        if (deputyCount > 0) {
          const deputyIdx = deputyCount === 1 ? 0 : (idx < 3 ? 0 : 1)
          sourceId = `detail-deputy-${deputyIdx}`
        } else if (expandedCoordinatorData.responsibilities?.length > 0) {
          sourceId = 'detail-responsibilities'
        }
        
        edgeList.push({
          id: `detail-to-subunit-${idx}`,
          source: sourceId,
          target: `detail-subunit-${idx}`,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })
    }

    return edgeList
  }, [data, expandedCoordinator, expandedCoordinatorData])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges)

  // Update nodes and edges when they change
  useEffect(() => {
    setFlowNodes(nodes)
    setFlowEdges(edges)
  }, [nodes, edges, setFlowNodes, setFlowEdges])

  // Form handlers
  const handleAddSubUnit = () => {
    if (contextMenu) {
      setFormModal({
        isOpen: true,
        type: 'subunit',
        title: 'Alt Birim Ekle',
        nodeId: contextMenu.nodeId,
      })
    }
  }

  const handleAddDeputy = () => {
    if (contextMenu) {
      setFormModal({
        isOpen: true,
        type: 'deputy',
        title: 'Yardımcı Ekle',
        nodeId: contextMenu.nodeId,
      })
    }
  }

  const handleAddResponsibility = () => {
    if (contextMenu) {
      setFormModal({
        isOpen: true,
        type: 'responsibility',
        title: 'Görev Ekle',
        nodeId: contextMenu.nodeId,
      })
    }
  }

  const handleAddPerson = () => {
    if (contextMenu) {
      setFormModal({
        isOpen: true,
        type: 'person',
        title: 'Kişi Ekle',
        nodeId: contextMenu.nodeId,
      })
    }
  }

  const handleEdit = () => {
    if (contextMenu) {
      const coord = data.coordinators.find(c => c.id === contextMenu.nodeId)
      const mainCoord = data.mainCoordinators.find(m => m.id === contextMenu.nodeId)
      const item = coord || mainCoord
      
      setFormModal({
        isOpen: true,
        type: 'edit',
        title: 'Düzenle',
        nodeId: contextMenu.nodeId,
        initialData: item ? {
          title: coord?.title || mainCoord?.title || '',
          description: coord?.description || mainCoord?.description || '',
        } : undefined
      })
    }
  }

  const handleDelete = () => {
    if (contextMenu && confirm('Bu birimi silmek istediğinize emin misiniz?')) {
      deleteCoordinator(contextMenu.nodeId)
    }
  }

  const handleFormSave = (formData: any) => {
    if (!formModal) return

    switch (formModal.type) {
      case 'edit':
        updateCoordinator(formModal.nodeId, {
          title: formData.title,
          description: formData.description,
        })
        break
      case 'subunit':
        addSubUnit(formModal.nodeId, {
          title: formData.title,
          people: [],
          responsibilities: formData.responsibilities || [],
        })
        break
      case 'deputy':
        addDeputy(formModal.nodeId, {
          name: formData.name,
          title: formData.title || 'Koordinatör Yardımcısı',
          responsibilities: formData.responsibilities || [],
        })
        break
      case 'responsibility':
        formData.responsibilities?.forEach((resp: string) => {
          addResponsibility(formModal.nodeId, resp)
        })
        break
    }
    
    setFormModal(null)
  }

  return (
    <div className="w-full h-screen relative" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodeContextMenu={handleNodeContextMenu}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        className="react-flow-custom"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={1.5}
          color="#60a5fa"
          className="opacity-20"
        />
        <Controls
          className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Expanded indicator */}
      {expandedCoordinator && (
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setExpandedCoordinator(null)}
            className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Detayları Kapat</span>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Help text */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <strong>İpucu:</strong> Herhangi bir birime <strong>sağ tık</strong> yaparak alt birim, yardımcı veya görev ekleyebilirsiniz.
          </p>
        </div>
      </div>

      {/* Logo */}
      <div className="absolute top-4 right-4 z-10">
        <img 
          src="/images/mth-logo.png" 
          alt="Milli Teknoloji Hamlesi" 
          className="h-12 w-auto"
        />
      </div>

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        nodeId={contextMenu?.nodeId || ''}
        nodeType={contextMenu?.nodeType || ''}
        onAddSubCoordinator={handleAddSubUnit}
        onAddDeputy={handleAddDeputy}
        onAddResponsibility={handleAddResponsibility}
        onAddPerson={handleAddPerson}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form Modal */}
      {formModal && (
        <FormModal
          isOpen={formModal.isOpen}
          onClose={() => setFormModal(null)}
          title={formModal.title}
          type={formModal.type}
          initialData={formModal.initialData}
          onSave={handleFormSave}
        />
      )}
    </div>
  )
}

const OrgCanvas = (props: OrgCanvasProps) => {
  return (
    <ReactFlowProvider>
      <OrgCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export default OrgCanvas
