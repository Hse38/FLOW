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
import TurkeyMapPanel from './TurkeyMapPanel'
import { useOrgData, Person } from '@/context/OrgDataContext'
import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'

const COLOR_PALETTE = [
  { name: 'Mavi', value: 'from-blue-600 to-indigo-600', code: 'blue' },
  { name: 'Kırmızı', value: 'from-red-600 to-rose-600', code: 'red' },
  { name: 'Yeşil', value: 'from-green-600 to-emerald-600', code: 'green' },
  { name: 'Mor', value: 'from-purple-600 to-violet-600', code: 'purple' },
  { name: 'Turuncu', value: 'from-orange-500 to-amber-600', code: 'orange' },
  { name: 'Pembe', value: 'from-pink-500 to-rose-500', code: 'pink' },
]

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
  isPresentationMode?: boolean
}

const OrgCanvasInner = ({ onNodeClick, currentProjectId, currentProjectName, isPresentationMode = false }: OrgCanvasProps) => {
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
    addCityPerson,
    updateCityPerson,
    deleteCityPerson,
    getCityPersonnel,
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

  // Türkiye Haritası Sol Panel (Toplumsal Çalışmalar için)
  const [turkeyMapOpen, setTurkeyMapOpen] = useState<boolean>(false)

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
    type: 'subunit' | 'deputy' | 'responsibility' | 'person' | 'edit' | 'edit-person'
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
    type?: 'person' | 'coordinator' | 'deputy'
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

  // Personel sağ tık context menu (düzenleme için)
  const [personContextMenu, setPersonContextMenu] = useState<{
    x: number
    y: number
    person: Person
    coordinatorId: string
    subUnitId: string
    coordinatorTitle: string
    subUnitTitle: string
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
  const handleUnitClickRef = useRef<(unitId: string) => void>(() => { })

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
      // Bu ana koordinatörlüğe bağlı tüm koordinatörlerin personel sayısını hesapla
      const childCoordinators = data.coordinators.filter(c => c.parent === coord.id)
      const personnelCount = childCoordinators.reduce((total, childCoord) => {
        return total + (childCoord.subUnits?.reduce((subTotal, subUnit) => {
          return subTotal + (subUnit.people?.length || 0)
        }, 0) || 0)
      }, 0)

      const normKadro = childCoordinators.reduce((total, childCoord) => {
        return total + (childCoord.normKadro || childCoord.subUnits?.reduce((subTotal, subUnit) => {
          return subTotal + (subUnit.normKadro || 0)
        }, 0) || 0)
      }, 0)

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
          personnelCount,
          normKadro,
        },
      })
    })

    // Add sub-coordinators
    data.coordinators.forEach((coord) => {
      const hasDetails = (coord.deputies?.length || 0) > 0 || (coord.subUnits?.length || 0) > 0

      // Koordinatöre bağlı tüm personel sayısını hesapla
      const personnelCount = coord.subUnits?.reduce((total, subUnit) => {
        return total + (subUnit.people?.length || 0)
      }, 0) || 0

      // normKadro: koordinatör düzeyinde veya tüm subUnitlerin normKadro toplamı
      const normKadro = coord.normKadro || coord.subUnits?.reduce((total, subUnit) => {
        return total + (subUnit.normKadro || 0)
      }, 0) || 0

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
          personnelCount,
          normKadro,
        },
      })
    })

    // If a coordinator is expanded, add detail nodes
    // If a coordinator is expanded, add detail nodes
    if (expandedCoordinatorData) {
      // Varsayılan pozisyon (custom position yoksa)
      const basePos = expandedCoordinatorData.position
      const defaultBaseX = basePos.x
      const defaultBaseY = basePos.y + 350

      const coordId = expandedCoordinatorData.id

      // Koordinatör node
      const rootId = `detail-${coordId}-root`
      nodeList.push({
        id: rootId,
        type: 'detail',
        position: getPosition(rootId, { x: defaultBaseX - 50, y: defaultBaseY }),
        draggable: !isLocked,
        data: {
          label: expandedCoordinatorData.title,
          type: 'coordinator',
          subtitle: expandedCoordinatorData.coordinator?.name,
        },
      })

      // Deputy nodes
      expandedCoordinatorData.deputies?.forEach((deputy, idx) => {
        const xOffset = expandedCoordinatorData.deputies!.length === 1 ? 0 :
          idx === 0 ? -150 : 150

        const deputyId = `detail-${coordId}-deputy-${idx}`
        nodeList.push({
          id: deputyId,
          type: 'detail',
          position: getPosition(deputyId, { x: defaultBaseX + xOffset - 50, y: defaultBaseY + 120 }),
          draggable: !isLocked,
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

        const subUnitId = `detail-${coordId}-subunit-${idx}`
        nodeList.push({
          id: subUnitId,
          type: 'detail',
          position: getPosition(subUnitId, { x: defaultBaseX + xOffset - 50, y: defaultBaseY + 240 + yOffset }),
          draggable: !isLocked,
          data: {
            label: subUnit.title,
            type: 'subunit',
            people: subUnit.people,
            responsibilities: subUnit.responsibilities,
            coordinatorId: expandedCoordinatorData.id,
            subUnitId: subUnit.id,
            normKadro: subUnit.normKadro,
            onPersonClick: (person: Person) => {
              setViewPersonCard({
                person,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: subUnit.id,
                coordinatorTitle: expandedCoordinatorData.title,
                subUnitTitle: subUnit.title,
              })
            },
            onPersonContextMenu: (e: React.MouseEvent, person: Person) => {
              e.preventDefault()
              e.stopPropagation()
              setPersonContextMenu({
                x: e.clientX,
                y: e.clientY,
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


      // People nodes (direct employees)
      const subUnitCount = expandedCoordinatorData.subUnits?.length || 0
      const subUnitRows = Math.ceil(subUnitCount / 3)
      const peopleStartY = subUnitRows > 0 ? (subUnitRows * 220) : 0 // Add extra spacing if subunits exist

      expandedCoordinatorData.people?.forEach((person, idx) => {
        const cols = 3
        const col = idx % cols
        const row = Math.floor(idx / cols)
        const totalWidth = (cols - 1) * 200
        const xOffset = (col * 200) - (totalWidth / 2)
        const yOffset = row * 200

        const personId = `detail-${coordId}-person-${idx}`
        nodeList.push({
          id: personId,
          type: 'detail',
          position: getPosition(personId, { x: defaultBaseX + xOffset - 50, y: defaultBaseY + 240 + peopleStartY + yOffset }),
          draggable: !isLocked,
          data: {
            label: person.name,
            type: 'person',
            subtitle: person.title || 'Ekip Üyesi',
            people: [person], // Pass as array for context menu compatibility
            coordinatorId: expandedCoordinatorData.id,
            onPersonClick: (p: Person) => {
              setViewPersonCard({
                person: p,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: '',
                coordinatorTitle: expandedCoordinatorData.title,
                subUnitTitle: 'Doğrudan Bağlı'
              })
            },
            onPersonContextMenu: (e: React.MouseEvent, p: Person) => {
              e.preventDefault()
              e.stopPropagation()
              setPersonContextMenu({
                x: e.clientX,
                y: e.clientY,
                person: p,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: '',
                coordinatorTitle: expandedCoordinatorData.title,
                subUnitTitle: 'Doğrudan Bağlı'
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
      const coordId = expandedCoordinatorData.id
      const rootId = `detail-${coordId}-root`

      // Main to coordinator detail
      edgeList.push({
        id: `detail-main-to-coord-${coordId}`,
        source: expandedCoordinator!,
        target: rootId,
        type: 'smoothstep',
        style: { stroke: '#3b82a0', strokeWidth: 2 },
      })

      // Coordinator to deputies
      expandedCoordinatorData.deputies?.forEach((_, idx) => {
        edgeList.push({
          id: `detail-coord-to-deputy-${coordId}-${idx}`,
          source: rootId,
          target: `detail-${coordId}-deputy-${idx}`,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })

      // Deputies to sub-units
      const deputyCount = expandedCoordinatorData.deputies?.length || 0
      expandedCoordinatorData.subUnits?.forEach((_, idx) => {
        let sourceId = rootId
        if (deputyCount > 0) {
          const deputyIdx = idx % deputyCount
          sourceId = `detail-${coordId}-deputy-${deputyIdx}`
        }

        edgeList.push({
          id: `detail-to-subunit-${coordId}-${idx}`,
          source: sourceId,
          target: `detail-${coordId}-subunit-${idx}`,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })

      // Deputies to people (or root to people)
      expandedCoordinatorData.people?.forEach((_, idx) => {
        let sourceId = rootId
        if (deputyCount > 0) {
          const deputyIdx = idx % deputyCount
          sourceId = `detail-${coordId}-deputy-${deputyIdx}`
        }

        edgeList.push({
          id: `detail-to-person-${coordId}-${idx}`,
          source: sourceId,
          target: `detail-${coordId}-person-${idx}`,
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
        // Detail node'ları da kaydet (unique ID kullandığımız için sorun yok)
        const updated = {
          ...customPositions,
          [nodeId]: { x: change.position!.x, y: change.position!.y }
        }
        updateFirebasePositions(updated)
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

  // Kişi/Koordinatör/Yardımcı renk güncelleme
  const handleUpdatePersonColor = useCallback((color: string) => {
    if (!viewPersonCard) return

    const { type, coordinatorId, subUnitId, person } = viewPersonCard

    // Anlık UI güncelleme
    setViewPersonCard(prev => prev ? { ...prev, person: { ...prev.person, color } } : null)

    if (!type || type === 'person') {
      updatePerson(coordinatorId, subUnitId, person.id, { color })
    } else if (type === 'coordinator') {
      const coord = data.coordinators.find(c => c.id === coordinatorId)
      if (coord && coord.coordinator) {
        updateCoordinator(coordinatorId, { coordinator: { ...coord.coordinator, color } } as any)
      }
    } else if (type === 'deputy') {
      const coord = data.coordinators.find(c => c.id === coordinatorId)
      if (coord && coord.deputies) {
        // Deputy'yi ismine göre bul
        const updatedDeputies = coord.deputies.map(d => d.name === person.name ? { ...d, color } : d)
        updateCoordinator(coordinatorId, { deputies: updatedDeputies } as any)
      }
    }
  }, [viewPersonCard, data.coordinators, updatePerson, updateCoordinator])

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

  // Export functions
  const exportToPng = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    try {
      const dataUrl = await toPng(flowElement, {
        backgroundColor: '#e0f2fe',
        quality: 1.0,
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.download = `${currentProjectName || 'org-chart'}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('PNG export failed:', error)
      alert('PNG dışa aktarma başarısız oldu')
    }
  }, [currentProjectName])

  const exportToSvg = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    try {
      const dataUrl = await toSvg(flowElement, {
        backgroundColor: '#e0f2fe',
      })

      const link = document.createElement('a')
      link.download = `${currentProjectName || 'org-chart'}.svg`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('SVG export failed:', error)
      alert('SVG dışa aktarma başarısız oldu')
    }
  }, [currentProjectName])

  const exportToPdf = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    try {
      const dataUrl = await toPng(flowElement, {
        backgroundColor: '#e0f2fe',
        quality: 1.0,
        pixelRatio: 2,
      })

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [flowElement.offsetWidth, flowElement.offsetHeight],
      })

      pdf.addImage(dataUrl, 'PNG', 0, 0, flowElement.offsetWidth, flowElement.offsetHeight)
      pdf.save(`${currentProjectName || 'org-chart'}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('PDF dışa aktarma başarısız oldu')
    }
  }, [currentProjectName])

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
      case 'edit-person':
        if (formData.personId && formData.subUnitId) {
          updatePerson(formModal.nodeId, formData.subUnitId, formData.personId, {
            name: formData.name,
            title: formData.title || '',
            university: formData.university || '',
            department: formData.department || '',
            jobDescription: formData.jobDescription || '',
          })
        }
        break
    }

    setFormModal(null)
  }

  return (
    <div className="w-full h-screen flex" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)' }}>
      {/* Sol Panel - Türkiye Haritası */}
      {turkeyMapOpen && (
        <TurkeyMapPanel
          isOpen={turkeyMapOpen}
          onClose={() => setTurkeyMapOpen(false)}
          cityPersonnel={getCityPersonnel()}
          onAddPerson={addCityPerson}
          onUpdatePerson={updateCityPerson}
          onDeletePerson={deleteCityPerson}
        />
      )}

      {/* Sağ Taraf - Şema */}
      <div className="flex-1 h-full relative">
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
            // Toplumsal Çalışmalar Koordinatörlüğü'ne tıklandığında sol panel aç/kapat
            if (node.id === 'toplumsal-calismalar') {
              setTurkeyMapOpen(prev => !prev)
              return
            }
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
          // Çoklu seçim özellikleri (masaüstü gibi)
          selectionOnDrag={true}
          panOnDrag={[1, 2]}
          selectNodesOnDrag={true}
          selectionKeyCode={null}
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
            <div className={`backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform ${isLocked
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

        {/* Person Card (Minimal Floating Card - Sağda) */}
        {viewPersonCard && (
          <div className="fixed top-1/2 right-6 -translate-y-1/2 w-[300px] z-[100] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-2.5 flex items-center justify-between">
              <span className="text-white text-xs font-semibold">Personel Bilgisi</span>
              <button
                onClick={() => setViewPersonCard(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Avatar and Name */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                  style={{ backgroundColor: viewPersonCard.person.color || '#6366f1' }}
                >
                  {viewPersonCard.person.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">{viewPersonCard.person.name}</h3>
                  <p className="text-xs text-gray-500">{viewPersonCard.person.title || 'Personel'}</p>
                </div>
              </div>

              {/* Department Info */}
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate max-w-[130px] font-medium">{viewPersonCard.coordinatorTitle}</span>
                  </div>
                  <a href="#" className="text-blue-600 hover:underline text-xs">Web Siteleri</a>
                </div>
                <div className="text-xs text-gray-500 ml-5">{viewPersonCard.subUnitTitle}</div>
              </div>

              {/* Üniversite ve Bölüm */}
              <div className="bg-indigo-50 rounded-lg px-3 py-2.5 mb-3">
                <h4 className="text-xs font-semibold text-indigo-600 mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                  </svg>
                  Üniversite / Bölüm
                </h4>
                {viewPersonCard.person.university || viewPersonCard.person.department ? (
                  <div className="text-xs text-gray-700">
                    {viewPersonCard.person.university && (
                      <div className="font-medium">{viewPersonCard.person.university}</div>
                    )}
                    {viewPersonCard.person.department && (
                      <div className="text-gray-500">{viewPersonCard.person.department}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belirtilmemiş</p>
                )}
              </div>

              {/* İş Kalemleri / Görev Tanımı */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  İş Kalemleri / Görev Tanımı
                </h4>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  {viewPersonCard.person.jobDescription ? (
                    <p className="text-xs text-gray-700 whitespace-pre-line">{viewPersonCard.person.jobDescription}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center">Görev tanımı belirtilmemiş</p>
                  )}
                </div>
              </div>

              {/* CV Section */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">ÖZGEÇMİŞ (CV)</h4>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                  <svg className="w-6 h-6 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs text-gray-400">CV yüklenmemiş</p>
                </div>
              </div>
            </div>
          </div>
        )}        {/* Person Context Menu (Sağ Tık Menüsü) */}
        {personContextMenu && (
          <div
            className="fixed z-[300] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{ left: personContextMenu.x, top: personContextMenu.y }}
            onClick={() => setPersonContextMenu(null)}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400">Personel</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{personContextMenu.person.name}</p>
            </div>
            <button
              onClick={() => {
                setFormModal({
                  isOpen: true,
                  type: 'edit-person' as any,
                  title: 'Personeli Düzenle',
                  nodeId: personContextMenu.coordinatorId,
                  initialData: {
                    personId: personContextMenu.person.id,
                    name: personContextMenu.person.name,
                    title: personContextMenu.person.title,
                    subUnitId: personContextMenu.subUnitId,
                    university: personContextMenu.person.university,
                    department: personContextMenu.person.department,
                    jobDescription: personContextMenu.person.jobDescription,
                  }
                })
                setPersonContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Düzenle
            </button>
            <button
              onClick={() => {
                setViewPersonCard({
                  person: personContextMenu.person,
                  coordinatorId: personContextMenu.coordinatorId,
                  subUnitId: personContextMenu.subUnitId,
                  coordinatorTitle: personContextMenu.coordinatorTitle,
                  subUnitTitle: personContextMenu.subUnitTitle,
                })
                setPersonContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Detayları Görüntüle
            </button>
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => {
                  if (confirm(`${personContextMenu.person.name} adlı personeli silmek istediğinize emin misiniz?`)) {
                    deletePerson(personContextMenu.coordinatorId, personContextMenu.subUnitId, personContextMenu.person.id)
                  }
                  setPersonContextMenu(null)
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Sil
              </button>
            </div>
          </div>
        )}



      </div>
    </div>
  )
}

// Wrap with ReactFlowProvider
const OrgCanvas = (props: OrgCanvasProps) => (
  <ReactFlowProvider>
    <OrgCanvasInner {...props} />
  </ReactFlowProvider>
)

export default OrgCanvas

