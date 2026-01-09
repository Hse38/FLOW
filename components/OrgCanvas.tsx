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
  NodeChange,
  useReactFlow,
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
import PersonDetailModal from './PersonDetailModal'
import LinkToMainSchemaModal from './LinkToMainSchemaModal'
import RightDetailPanel from './RightDetailPanel'
import NormKadroModal from './NormKadroModal'
import { useOrgData, Person } from '@/context/OrgDataContext'

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
  currentProjectId?: string | null
  currentProjectName?: string
}

const OrgCanvasInner = ({ onNodeClick, currentProjectId, currentProjectName }: OrgCanvasProps) => {
  const { 
    data, 
    addSubUnit, 
    addDeputy, 
    addResponsibility, 
    addCoordinator, 
    deleteCoordinator, 
    deleteNode, 
    updateCoordinator, 
    addManagement, 
    addExecutive, 
    addMainCoordinator, 
    updatePerson, 
    addPerson,
    deletePerson,
    updateSubUnit,
    linkSchemaToCoordinator,
    // Firebase senkronizasyon
    isLocked: firebaseLocked,
    setLocked: setFirebaseLocked,
    positions: firebasePositions,
    updatePositions: updateFirebasePositions,
    customConnections: firebaseConnections,
    addConnection: addFirebaseConnection,
    removeConnection: removeFirebaseConnection,
    isLoading
  } = useOrgData()
  const reactFlowInstance = useReactFlow()
  
  const [expandedCoordinator, setExpandedCoordinator] = useState<string | null>(null)
  
  // Sağ panel için seçili koordinatör
  const [rightPanelCoordinatorId, setRightPanelCoordinatorId] = useState<string | null>(null)

  // Norm Kadro Modal
  const [normKadroModal, setNormKadroModal] = useState<boolean>(false)
  
  // Kilitleme durumu - Firebase'den geliyor
  const isLocked = firebaseLocked

  // Özel pozisyonlar - Firebase'den geliyor
  const customPositions = firebasePositions
  
  // Pozisyonları güncellemek için local state (drag sırasında)
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Boş alan context menu state - now includes position for adding nodes
  const [paneContextMenu, setPaneContextMenu] = useState<{ x: number; y: number; flowPosition?: { x: number; y: number } } | null>(null)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
    nodeType: string
  } | null>(null)
  
  // New node form modal
  const [newNodeModal, setNewNodeModal] = useState<{
    isOpen: boolean
    type: 'management' | 'executive' | 'mainCoordinator' | 'coordinator'
    position: { x: number; y: number }
  } | null>(null)
  
  // Form modal state
  const [formModal, setFormModal] = useState<{
    isOpen: boolean
    type: 'subunit' | 'deputy' | 'responsibility' | 'person' | 'edit'
    title: string
    nodeId: string
    initialData?: any
  } | null>(null)

  // Video modal state
  const [videoModal, setVideoModal] = useState<boolean>(false)

  // Personel detay modal state (düzenleme için)
  const [personDetailModal, setPersonDetailModal] = useState<{
    isOpen: boolean
    person: Person
    coordinatorId: string
    subUnitId: string
  } | null>(null)

  // Sağ tarafta kişi görüntüleme kartı (şema üzerinden tıklayınca)
  const [viewPersonCard, setViewPersonCard] = useState<{
    person: Person
    coordinatorId: string
    subUnitId: string
    coordinatorTitle: string
    subUnitTitle: string
  } | null>(null)

  // Alt birim context menu (kişi ekle/sil için)
  const [subUnitContextMenu, setSubUnitContextMenu] = useState<{
    x: number
    y: number
    coordinatorId: string
    subUnitId: string
    subUnitTitle: string
    people: Person[]
  } | null>(null)

  // Link to main schema modal state
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean
    nodeId: string
  } | null>(null)

  // Custom connections (ip çekme) - Firebase'den geliyor
  const customConnections = useMemo(() => {
    return (firebaseConnections || []).map((conn, idx) => ({
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle || 'bottom',
      targetHandle: conn.targetHandle || 'top',
      id: `custom-${conn.source}-${conn.target}-${idx}`
    }))
  }, [firebaseConnections])

  // Connection mode state (bağlantı oluşturma modu)
  const [connectionMode, setConnectionMode] = useState<{ active: boolean; sourceId: string | null; sourceName: string | null; sourceHandle: 'top' | 'bottom' }>({
    active: false,
    sourceId: null,
    sourceName: null,
    sourceHandle: 'bottom'
  })

  // Bağlantı yönü seçimi modal
  const [connectionHandleModal, setConnectionHandleModal] = useState<{ 
    isOpen: boolean; 
    nodeId: string; 
    nodeName: string 
  } | null>(null)

  // Connection list modal (bağlantı listesi)
  const [connectionListModal, setConnectionListModal] = useState<{ isOpen: boolean; nodeId: string } | null>(null)

  // Yeni şemada mıyız kontrolü
  const isInNewSchema = !!currentProjectId

  // Handler using ref to avoid stale closures
  const handleUnitClickRef = useRef<(unitId: string) => void>(() => {})

  handleUnitClickRef.current = (unitId: string) => {
    // Bağlantı modundaysa hedef seçimi için modal aç
    if (connectionMode.active) {
      setPendingTarget({ targetId: unitId })
      return
    }

    const coordinator = data.coordinators.find((c) => c.id === unitId)
    const mainCoord = data.mainCoordinators.find((m) => m.id === unitId)
    
    const item = coordinator || mainCoord
    if (item) {
      // Her zaman toggle et - içi boş bile olsa açılabilmeli (düzenleme için)
      if (coordinator) {
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

    // Pozisyon al (özel veya varsayılan)
    const getPosition = (id: string, defaultPos: { x: number; y: number }) => {
      return customPositions[id] || defaultPos
    }

    // Add chairman
    data.management.forEach((item) => {
      nodeList.push({
        id: item.id,
        type: 'chairman',
        position: getPosition(item.id, item.position),
        draggable: !isLocked,
        data: {
          label: item.name,
          title: item.title,
          onVideoClick: () => setVideoModal(true),
        },
      })
    })

    // Add executives
    data.executives.forEach((exec) => {
      nodeList.push({
        id: exec.id,
        type: 'executive',
        position: getPosition(exec.id, exec.position),
        draggable: !isLocked,
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
        position: getPosition(coord.id, coord.position),
        draggable: !isLocked,
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
        position: getPosition(coord.id, coord.position),
        draggable: !isLocked,
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
            people: subUnit.people,
            responsibilities: subUnit.responsibilities,
            coordinatorId: expandedCoordinatorData.id,
            subUnitId: subUnit.id,
            normKadro: subUnit.normKadro,  // Norm kadro bilgisi
            onPersonClick: (person: Person) => {
              // Şema üzerinden tıklayınca sağda görüntüleme kartı aç
              setViewPersonCard({
                person,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: subUnit.id,
                coordinatorTitle: expandedCoordinatorData.title,
                subUnitTitle: subUnit.title,
              })
            },
            onContextMenu: (e: React.MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
              setSubUnitContextMenu({
                x: e.clientX,
                y: e.clientY,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: subUnit.id,
                subUnitTitle: subUnit.title,
                people: subUnit.people || [],
              })
            },
          },
        })
      })
    }

    return nodeList
  }, [data, handleUnitClick, handleContextMenu, expandedCoordinator, expandedCoordinatorData, customPositions, isLocked])

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

    // Custom connections (manuel bağlantılar) - beyaz çizgi, diğerleri gibi
    customConnections.forEach((conn) => {
      edgeList.push({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle || 'bottom',
        targetHandle: conn.targetHandle || 'top',
        type: 'smoothstep',
        style: { stroke: '#ffffff', strokeWidth: 2.5 },
      })
    })

    return edgeList
  }, [data, expandedCoordinator, expandedCoordinatorData, customConnections])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges)

  // nodes veya edges değiştiğinde flowNodes ve flowEdges'i güncelle
  useEffect(() => {
    setFlowNodes(nodes)
  }, [nodes, setFlowNodes])

  useEffect(() => {
    setFlowEdges(edges)
  }, [edges, setFlowEdges])

  // Node sürüklendiğinde pozisyonu Firebase'e kaydet
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    
    // Sürükleme bittiğinde pozisyonu kaydet
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        const nodeId = change.id
        // Detail node'ları kaydetme
        if (!nodeId.startsWith('detail-')) {
          const updated = {
            ...customPositions,
            [nodeId]: { x: change.position!.x, y: change.position!.y }
          }
          updateFirebasePositions(updated)
        }
      }
    })
  }, [onNodesChange, customPositions, updateFirebasePositions])

  // Kilitleme toggle - Firebase'e kaydet
  const toggleLock = useCallback(() => {
    setFirebaseLocked(!isLocked)
    setPaneContextMenu(null)
  }, [isLocked, setFirebaseLocked])

  // Pozisyonları sıfırla - Firebase'den sil
  const resetPositions = useCallback(() => {
    updateFirebasePositions({})
    setPaneContextMenu(null)
  }, [updateFirebasePositions])

  // Custom connection (bağlantı) oluşturma - önce yön seçimi modal açılır
  const startConnection = useCallback((nodeId: string, nodeName: string, sourceHandle: 'top' | 'bottom') => {
    setConnectionMode({ active: true, sourceId: nodeId, sourceName: nodeName, sourceHandle })
    setContextMenu(null)
    setConnectionHandleModal(null)
  }, [])

  // Hedef seçildiğinde targetHandle seçimi için modal aç
  const [pendingTarget, setPendingTarget] = useState<{ targetId: string } | null>(null)

  const completeConnection = useCallback((targetId: string, targetHandle: 'top' | 'bottom') => {
    if (connectionMode.sourceId && connectionMode.sourceId !== targetId) {
      addFirebaseConnection({
        source: connectionMode.sourceId,
        target: targetId,
        sourceHandle: connectionMode.sourceHandle,
        targetHandle: targetHandle
      })
    }
    setConnectionMode({ active: false, sourceId: null, sourceName: null, sourceHandle: 'bottom' })
    setPendingTarget(null)
  }, [connectionMode, addFirebaseConnection])

  const cancelConnection = useCallback(() => {
    setConnectionMode({ active: false, sourceId: null, sourceName: null, sourceHandle: 'bottom' })
    setPendingTarget(null)
  }, [])

  // Bağlantı kaldır - Firebase'den sil
  const handleRemoveConnection = useCallback((source: string, target: string) => {
    removeFirebaseConnection(source, target)
  }, [removeFirebaseConnection])

  // Boş alana sağ tıklama
  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    // Screen coordinates to flow coordinates
    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    setPaneContextMenu({ x: event.clientX, y: event.clientY, flowPosition })
  }, [reactFlowInstance])

  // Yeni node ekleme fonksiyonları
  const handleAddNewNode = useCallback((type: 'management' | 'executive' | 'mainCoordinator' | 'coordinator') => {
    if (!paneContextMenu?.flowPosition) return
    
    const position = paneContextMenu.flowPosition
    
    if (type === 'management') {
      addManagement({
        name: 'Yeni Yönetici',
        title: 'Başkan',
        type: 'chairman',
        position
      })
    } else if (type === 'executive') {
      addExecutive({
        name: 'Yeni Yönetici',
        title: 'Genel Müdür Yardımcısı',
        type: 'executive',
        position,
        parent: data.management[0]?.id || ''
      })
    } else if (type === 'mainCoordinator') {
      addMainCoordinator({
        title: 'Yeni Ana Koordinatörlük',
        description: '',
        type: 'main-coordinator',
        position,
        parent: data.executives[0]?.id || null
      })
    } else if (type === 'coordinator') {
      const parentId = data.mainCoordinators[0]?.id || ''
      addCoordinator(parentId, {
        title: 'Yeni Koordinatörlük',
        description: '',
        responsibilities: [],
        parent: parentId,
        deputies: [],
        subUnits: [],
        position
      })
    }
    
    setPaneContextMenu(null)
  }, [paneContextMenu, addManagement, addExecutive, addMainCoordinator, addCoordinator, data])

  // Update nodes and edges when they change
  useEffect(() => {
    setFlowNodes(nodes)
    setFlowEdges(edges)
  }, [nodes, edges, setFlowNodes, setFlowEdges])

  // Menüleri kapat
  useEffect(() => {
    const handleClick = () => {
      setPaneContextMenu(null)
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

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

  // Hiyerarşik ekleme: Chairman altına Executive
  const handleAddExecutiveToChairman = () => {
    if (contextMenu) {
      const chairman = data.management.find(m => m.id === contextMenu.nodeId)
      if (chairman) {
        const newPosition = {
          x: chairman.position.x,
          y: chairman.position.y + 150
        }
        addExecutive({
          name: 'Yeni Genel Müdür Yardımcısı',
          title: 'Genel Müdür Yardımcısı',
          type: 'executive',
          position: newPosition,
          parent: chairman.id
        })
      }
      setContextMenu(null)
    }
  }

  // Hiyerarşik ekleme: Executive altına MainCoordinator
  const handleAddMainCoordinatorToExecutive = () => {
    if (contextMenu) {
      const exec = data.executives.find(e => e.id === contextMenu.nodeId)
      if (exec) {
        const existingCount = data.mainCoordinators.filter(mc => mc.parent === exec.id).length
        const newPosition = {
          x: exec.position.x + (existingCount * 400),
          y: exec.position.y + 150
        }
        addMainCoordinator({
          title: 'Yeni Ana Koordinatörlük',
          description: '',
          type: 'main-coordinator',
          position: newPosition,
          parent: exec.id
        })
      }
      setContextMenu(null)
    }
  }

  // Hiyerarşik ekleme: MainCoordinator altına Coordinator
  const handleAddCoordinatorToMainCoordinator = () => {
    if (contextMenu) {
      const mainCoord = data.mainCoordinators.find(mc => mc.id === contextMenu.nodeId)
      if (mainCoord) {
        const existingCount = data.coordinators.filter(c => c.parent === mainCoord.id).length
        const newPosition = {
          x: mainCoord.position.x + (existingCount * 350),
          y: mainCoord.position.y + 200
        }
        addCoordinator(mainCoord.id, {
          title: 'Yeni Koordinatörlük',
          description: '',
          responsibilities: [],
          parent: mainCoord.id,
          deputies: [],
          subUnits: [],
          position: newPosition
        })
      }
      setContextMenu(null)
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
      deleteNode(contextMenu.nodeId, contextMenu.nodeType)
      setContextMenu(null)
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
      case 'person':
        if (formData.subUnitId && formData.name) {
          addPerson(formModal.nodeId, formData.subUnitId, {
            name: formData.name,
            title: formData.title || '',
          })
        }
        break
    }
    
    setFormModal(null)
  }

  return (
    <div className="w-full h-screen relative" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeClick={(_, node) => {
          // Bağlantı modundaysa hedef yönü seçimi için modal aç
          if (connectionMode.active && node.id !== connectionMode.sourceId) {
            setPendingTarget({ targetId: node.id })
          }
        }}
        nodesDraggable={!isLocked}
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

      {/* Expanded indicator + Kilit durumu göstergesi */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Kilit ikonu */}
          <div className={`backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform ${
            isLocked 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`} onClick={toggleLock} title={isLocked ? 'Kilidi Aç' : 'Kilitle'}>
            {isLocked ? (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
          </div>

          {/* Pozisyonları Kaydet butonu */}
          {!isLocked && (
            <button
              onClick={() => {
                // Mevcut node pozisyonlarını al ve kaydet
                const currentPositions: Record<string, { x: number; y: number }> = {}
                flowNodes.forEach(node => {
                  if (!node.id.startsWith('detail-')) {
                    currentPositions[node.id] = { x: node.position.x, y: node.position.y }
                  }
                })
                updateFirebasePositions(currentPositions)
                alert('Pozisyonlar kaydedildi!')
              }}
              className="backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform bg-blue-50 border-blue-200"
              title="Pozisyonları Kaydet"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
          )}

          {/* Norm Kadro Butonu - Her zaman görünür */}
          <button
            onClick={() => setNormKadroModal(true)}
            className="backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform bg-indigo-600 border-indigo-700 flex items-center gap-2"
            title="Norm Kadro Yönetimi"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-bold text-white">Norm</span>
          </button>

          {/* Detayları Kapat butonu */}
          {expandedCoordinator && (
            <button
              onClick={() => setExpandedCoordinator(null)}
              className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Detayları Kapat</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Düzenle Butonu - Koordinatör seçiliyken görünür */}
      {expandedCoordinator && expandedCoordinatorData && (
        <button
          onClick={() => setRightPanelCoordinatorId(expandedCoordinator)}
          className="absolute top-20 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3 hover:bg-blue-50 hover:border-blue-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 truncate max-w-[180px]">{expandedCoordinatorData.title}</p>
            <p className="text-xs text-gray-500">Detayları Düzenle</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Sağ Detay Paneli */}
      <RightDetailPanel
        isOpen={!!rightPanelCoordinatorId}
        onClose={() => setRightPanelCoordinatorId(null)}
        coordinator={data.coordinators.find(c => c.id === rightPanelCoordinatorId) || null}
        onUpdateCoordinator={updateCoordinator}
        onAddDeputy={addDeputy}
        onAddSubUnit={addSubUnit}
        onAddPerson={addPerson}
        onUpdatePerson={updatePerson}
        onDeletePerson={deletePerson}
      />

      {/* Norm Kadro Modal */}
      <NormKadroModal
        isOpen={normKadroModal}
        onClose={() => setNormKadroModal(false)}
        coordinators={data.coordinators}
        onUpdateCoordinator={updateCoordinator}
        onUpdateSubUnit={updateSubUnit}
      />

      {/* Logo */}
      <div className="absolute top-4 right-4 z-10">
        <img 
          src="/images/mth-logo.png" 
          alt="Milli Teknoloji Hamlesi" 
          className="h-12 w-auto"
        />
      </div>

      {/* Connection Mode Indicator */}
      {connectionMode.active && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-amber-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3">
          <div className="animate-pulse w-3 h-3 bg-white rounded-full"></div>
          <span className="font-medium">
            "{connectionMode.sourceName}" için hedef seçin
          </span>
          <button
            onClick={cancelConnection}
            className="ml-2 bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-lg text-sm"
          >
            İptal
          </button>
        </div>
      )}

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
        onAddExecutive={handleAddExecutiveToChairman}
        onAddMainCoordinator={handleAddMainCoordinatorToExecutive}
        onAddCoordinator={handleAddCoordinatorToMainCoordinator}
        onLinkToMainSchema={() => {
          if (contextMenu) {
            setLinkModal({ isOpen: true, nodeId: contextMenu.nodeId })
          }
        }}
        isInNewSchema={isInNewSchema}
        onStartConnection={() => {
          if (contextMenu) {
            // Node adını bul
            const coord = data.coordinators.find(c => c.id === contextMenu.nodeId)
            const mainCoord = data.mainCoordinators.find(m => m.id === contextMenu.nodeId)
            const exec = data.executives.find(e => e.id === contextMenu.nodeId)
            const mgmt = data.management.find(m => m.id === contextMenu.nodeId)
            const nodeName = coord?.title || mainCoord?.title || exec?.name || mgmt?.name || 'Bilinmeyen'
            // Önce kaynak yönü seçimi için modal aç
            setConnectionHandleModal({ isOpen: true, nodeId: contextMenu.nodeId, nodeName })
            setContextMenu(null)
          }
        }}
        hasConnections={customConnections.some(c => c.source === contextMenu?.nodeId || c.target === contextMenu?.nodeId)}
        onShowConnections={() => {
          if (contextMenu) {
            setConnectionListModal({ isOpen: true, nodeId: contextMenu.nodeId })
          }
        }}
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
          subUnits={
            formModal.type === 'person' 
              ? (data.coordinators.find(c => c.id === formModal.nodeId)?.subUnits || [])
              : []
          }
        />
      )}

      {/* Personel Detay Modal */}
      {personDetailModal && (
        <PersonDetailModal
          isOpen={personDetailModal.isOpen}
          onClose={() => setPersonDetailModal(null)}
          person={personDetailModal.person}
          onSave={(updates) => {
            updatePerson(
              personDetailModal.coordinatorId,
              personDetailModal.subUnitId,
              personDetailModal.person.id,
              updates
            )
          }}
        />
      )}

      {/* Şema Üzerinden Kişi Görüntüleme Kartı */}
      {viewPersonCard && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 w-[320px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Personel Bilgisi</span>
              <button 
                onClick={() => setViewPersonCard(null)} 
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                {viewPersonCard.person.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-lg">{viewPersonCard.person.name}</h4>
                <p className="text-blue-200 text-sm">{viewPersonCard.person.title || 'Personel'}</p>
              </div>
            </div>
          </div>

          {/* Birim Bilgisi */}
          <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{viewPersonCard.coordinatorTitle}</span>
            <span className="text-gray-300">›</span>
            <span className="text-blue-600 font-medium">{viewPersonCard.subUnitTitle}</span>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* İletişim Bilgileri */}
            {(viewPersonCard.person.email || viewPersonCard.person.phone) && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-400 uppercase">İletişim</h5>
                {viewPersonCard.person.email && (
                  <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">{viewPersonCard.person.email}</span>
                  </div>
                )}
                {viewPersonCard.person.phone && (
                  <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">{viewPersonCard.person.phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Görevler / Notlar */}
            {viewPersonCard.person.notes && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-400 uppercase">Görevler</h5>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{viewPersonCard.person.notes}</p>
                </div>
              </div>
            )}

            {/* CV */}
            {viewPersonCard.person.cvFileName ? (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-400 uppercase">Özgeçmiş (CV)</h5>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 truncate">{viewPersonCard.person.cvFileName}</p>
                      <p className="text-xs text-gray-500">CV Dosyası</p>
                    </div>
                    {viewPersonCard.person.cvData && (
                      <button
                        onClick={() => {
                          // Base64 veriyi indir
                          const link = document.createElement('a')
                          link.href = viewPersonCard.person.cvData!
                          link.download = viewPersonCard.person.cvFileName!
                          link.click()
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        İndir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-400 uppercase">Özgeçmiş (CV)</h5>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                  <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs text-gray-400">CV yüklenmemiş</p>
                </div>
              </div>
            )}

            {/* Düzenle Butonu */}
            <button
              onClick={() => {
                setPersonDetailModal({
                  isOpen: true,
                  person: viewPersonCard.person,
                  coordinatorId: viewPersonCard.coordinatorId,
                  subUnitId: viewPersonCard.subUnitId,
                })
                setViewPersonCard(null)
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Düzenle
            </button>
          </div>
        </div>
      )}

      {/* Link to Main Schema Modal */}
      {linkModal && (
        <LinkToMainSchemaModal
          isOpen={linkModal.isOpen}
          onClose={() => setLinkModal(null)}
          currentSchemaId={currentProjectId || ''}
          currentSchemaName={currentProjectName || 'Yeni Şema'}
          onLink={(coordinatorId) => {
            linkSchemaToCoordinator(currentProjectId || '', coordinatorId)
            alert('Şema başarıyla bağlandı! Ana şemada ilgili koordinatörlüğe tıkladığınızda bu şema görünecek.')
          }}
        />
      )}

      {/* Alt Birim Context Menu - Kişi Ekle/Sil */}
      {subUnitContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setSubUnitContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]"
            style={{ left: subUnitContextMenu.x, top: subUnitContextMenu.y }}
          >
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase border-b mb-1">
              {subUnitContextMenu.subUnitTitle}
            </div>
            
            {/* Kişi Ekle */}
            <button
              onClick={() => {
                setFormModal({
                  isOpen: true,
                  type: 'person',
                  title: `${subUnitContextMenu.subUnitTitle} - Kişi Ekle`,
                  nodeId: subUnitContextMenu.coordinatorId,
                  initialData: { subUnitId: subUnitContextMenu.subUnitId }
                })
                setSubUnitContextMenu(null)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Kişi Ekle</span>
            </button>

            {/* Kişileri Listele ve Sil */}
            {subUnitContextMenu.people.length > 0 && (
              <>
                <div className="border-t my-1"></div>
                <div className="px-3 py-1 text-xs font-semibold text-gray-500">Kişiler</div>
                {subUnitContextMenu.people.map((person) => (
                  <div 
                    key={person.id}
                    className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 group"
                  >
                    <span className="text-gray-700">{person.name}</span>
                    <button
                      onClick={() => {
                        if (confirm(`"${person.name}" silinecek. Emin misiniz?`)) {
                          deletePerson(
                            subUnitContextMenu.coordinatorId,
                            subUnitContextMenu.subUnitId,
                            person.id
                          )
                          setSubUnitContextMenu(null)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded transition-opacity"
                      title="Kişiyi Sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* Boş Alan Context Menu */}
      {paneContextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px]"
          style={{ left: paneContextMenu.x, top: paneContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Yeni birim ekleme bölümü - sadece mantıklı seçenekleri göster */}
          <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Yeni Ekle</div>
          
          {/* Yönetici (Chairman) - Eğer hiç yoksa veya birden fazla olabilir */}
          <button
            onClick={() => handleAddNewNode('management')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Yönetici (Başkan)</span>
          </button>
          
          {/* Genel Müdür Yardımcısı - Chairman varsa */}
          {data.management.length > 0 && (
            <button
              onClick={() => handleAddNewNode('executive')}
              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Genel Müdür Yardımcısı</span>
            </button>
          )}
          
          {/* Ana Koordinatörlük - Executive varsa */}
          {data.executives.length > 0 && (
            <button
              onClick={() => handleAddNewNode('mainCoordinator')}
              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Ana Koordinatörlük</span>
            </button>
          )}
          
          {/* Koordinatörlük - MainCoordinator varsa */}
          {data.mainCoordinators.length > 0 && (
            <button
              onClick={() => handleAddNewNode('coordinator')}
              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Koordinatörlük</span>
            </button>
          )}
          
          <div className="border-t border-gray-200 my-2"></div>
          
          {/* Kilitleme bölümü */}
          <button
            onClick={toggleLock}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            {isLocked ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <span>Kilidi Aç</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Kilitle</span>
              </>
            )}
          </button>
          <button
            onClick={resetPositions}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-orange-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Pozisyonları Sıfırla</span>
          </button>
        </div>
      )}

      {/* Video Modal */}
      {videoModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setVideoModal(false)}
        >
          <div 
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kapatma butonu */}
            <button
              onClick={() => setVideoModal(false)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Video player */}
            <video 
              controls 
              autoPlay
              playsInline
              className="w-full aspect-video"
            >
              <source src="/videos/abim.mp4" type="video/mp4" />
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
            
            {/* Başlık */}
            <div className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-center">
              <h3 className="text-lg font-bold text-gray-900">Selçuk Bayraktar</h3>
              <p className="text-sm text-yellow-900">T3 Vakfı Mütevelli Heyeti Başkanı</p>
            </div>
          </div>
        </div>
      )}

      {/* Kaynak Bağlantı Noktası Seçim Modal */}
      {connectionHandleModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setConnectionHandleModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h3 className="text-lg font-bold text-white">Bağlantı Noktası Seçin</h3>
              <p className="text-sm text-blue-100">"{connectionHandleModal.nodeName}" için çıkış yönü</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => startConnection(connectionHandleModal.nodeId, connectionHandleModal.nodeName, 'top')}
                className="w-full p-4 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Üstten Çıkış</div>
                  <div className="text-sm text-gray-500">Bağlantı üst noktadan başlar</div>
                </div>
              </button>
              <button
                onClick={() => startConnection(connectionHandleModal.nodeId, connectionHandleModal.nodeName, 'bottom')}
                className="w-full p-4 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Alttan Çıkış</div>
                  <div className="text-sm text-gray-500">Bağlantı alt noktadan başlar</div>
                </div>
              </button>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setConnectionHandleModal(null)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hedef Bağlantı Noktası Seçim Modal */}
      {pendingTarget && connectionMode.active && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={cancelConnection}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
              <h3 className="text-lg font-bold text-white">Hedef Bağlantı Noktası</h3>
              <p className="text-sm text-green-100">Hedef node için giriş yönü seçin</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => completeConnection(pendingTarget.targetId, 'top')}
                className="w-full p-4 bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-400 rounded-xl transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Üstten Giriş</div>
                  <div className="text-sm text-gray-500">Bağlantı üst noktaya bağlanır</div>
                </div>
              </button>
              <button
                onClick={() => completeConnection(pendingTarget.targetId, 'bottom')}
                className="w-full p-4 bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-400 rounded-xl transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Alttan Giriş</div>
                  <div className="text-sm text-gray-500">Bağlantı alt noktaya bağlanır</div>
                </div>
              </button>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={cancelConnection}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection List Modal */}
      {connectionListModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setConnectionListModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4">
              <h3 className="text-lg font-bold text-white">Bağlantılar</h3>
              <p className="text-sm text-amber-100">Bu node'a bağlı olan bağlantılar</p>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {customConnections.filter(c => c.source === connectionListModal.nodeId || c.target === connectionListModal.nodeId).map(conn => {
                // Bağlı node adını bul
                const isSource = conn.source === connectionListModal.nodeId
                const otherId = isSource ? conn.target : conn.source
                const otherCoord = data.coordinators.find(c => c.id === otherId)
                const otherMainCoord = data.mainCoordinators.find(m => m.id === otherId)
                const otherExec = data.executives.find(e => e.id === otherId)
                const otherMgmt = data.management.find(m => m.id === otherId)
                const otherName = otherCoord?.title || otherMainCoord?.title || otherExec?.name || otherMgmt?.name || 'Bilinmeyen'

                return (
                  <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <div>
                        <span className="font-medium">{otherName}</span>
                        <span className="text-xs text-gray-500 ml-2">({isSource ? 'Hedef' : 'Kaynak'})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveConnection(conn.source, conn.target)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Bağlantıyı Kaldır"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              {customConnections.filter(c => c.source === connectionListModal.nodeId || c.target === connectionListModal.nodeId).length === 0 && (
                <p className="text-gray-500 text-center py-4">Bu node'a bağlı bağlantı yok</p>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setConnectionListModal(null)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
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
