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
import TurkeyMapPanel from './TurkeyMapPanel'
import ConfirmationModal from './ConfirmationModal'
import AutoLayoutSelectionModal from './AutoLayoutSelectionModal'
import { showToast } from './Toast'
import { useOrgData, Person, OrgData } from '@/context/OrgDataContext'
import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'
import dagre from '@dagrejs/dagre'

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

// Basit node boyutları - dagre yerleşimi için
const NODE_SIZE: Record<string, { width: number; height: number }> = {
  chairman: { width: 320, height: 140 },
  executive: { width: 280, height: 120 },
  mainCoordinator: { width: 280, height: 120 },
  subCoordinator: { width: 260, height: 110 },
  detail: { width: 220, height: 100 },
  default: { width: 260, height: 110 }
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
    deleteDeputy,
    deleteSubUnit,
    updateSubUnit,
    addCityPerson,
    updateCityPerson,
    deleteCityPerson,
    getCityPersonnel,
    linkSchemaToCoordinator,
    restoreData,
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

  // Undo/Redo history
  const [history, setHistory] = useState<OrgData[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [shouldAutoLayout, setShouldAutoLayout] = useState<boolean>(false)

  // History'ye snapshot ekle
  const addToHistory = useCallback((snapshot: OrgData) => {
    setHistory(prev => {
      // Mevcut index'ten sonraki tüm history'yi temizle (yeni branch oluşturma)
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(snapshot))) // Deep copy
      // Maksimum 50 adım history tut
      if (newHistory.length > 50) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setHistoryIndex(prev => {
      const newIndex = prev + 1
      return newIndex > 49 ? 49 : newIndex // Maksimum index
    })
  }, [historyIndex])

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && history.length > 0) {
      isUndoRedoRef.current = true
      const previousData = history[historyIndex - 1]
      restoreData(previousData)
      setHistoryIndex(prev => prev - 1)
      setShouldAutoLayout(true)
    }
  }, [history, historyIndex, restoreData])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && history.length > 0) {
      isUndoRedoRef.current = true
      const nextData = history[historyIndex + 1]
      restoreData(nextData)
      setHistoryIndex(prev => prev + 1)
      setShouldAutoLayout(true)
    }
  }, [history, historyIndex, restoreData])

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Data değişikliklerini dinle ve history'ye ekle (undo/redo hariç)
  const isUndoRedoRef = useRef(false)
  const dataChangeRef = useRef(false)
  
  useEffect(() => {
    // İlk yüklemede initial snapshot ekle
    if (history.length === 0 && !isLoading && data) {
      addToHistory(data)
      setHistoryIndex(0)
      return
    }
    
    // Undo/Redo sırasında history'ye ekleme
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    
    // Sadece gerçek değişikliklerde history'ye ekle (ilk yüklemede değil)
    if (dataChangeRef.current && !isLoading) {
      const timer = setTimeout(() => {
        addToHistory(data)
        dataChangeRef.current = false
      }, 500) // Debounce - kullanıcı işlemlerini bekle
      
      return () => clearTimeout(timer)
    }
  }, [data, isLoading, addToHistory, history.length])
  
  // Data değişikliklerini takip et (ekleme/silme işlemleri)
  useEffect(() => {
    if (!isLoading && history.length > 0) {
      dataChangeRef.current = true
    }
  }, [data.coordinators.length, data.mainCoordinators.length, data.executives.length, data.management.length, isLoading, history.length])


  const [expandedCoordinator, setExpandedCoordinator] = useState<string | null>(null)

  // Sağ panel için seçili koordinatör
  const [rightPanelCoordinatorId, setRightPanelCoordinatorId] = useState<string | null>(null)

  // Türkiye Haritası Sol Panel (Toplumsal Çalışmalar için)
  const [turkeyMapOpen, setTurkeyMapOpen] = useState<boolean>(false)

  // Kilitleme durumu - Firebase'den geliyor
  const isLocked = firebaseLocked

  // Özel pozisyonlar - Firebase'den geliyor
  const customPositions = firebasePositions

  // Yerel pozisyon cache (hemen ekrana yansıtmak için)
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
    type: 'subunit' | 'deputy' | 'responsibility' | 'person' | 'edit' | 'edit-person' | 'coordinator'
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
    type?: 'person' | 'deputy' | 'coordinator' // Deputy veya person ayırımı için
    deputyId?: string // Deputy ID'si
  } | null>(null)

  // Link to main schema modal state
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean
    nodeId: string
  } | null>(null)

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
    onConfirm: () => void
  } | null>(null)

  // Auto layout selection modal state
  const [autoLayoutSelectionModal, setAutoLayoutSelectionModal] = useState<boolean>(false)

  // Selected nodes state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])

  // Handle selection change
  const handleSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(params.nodes.map(n => n.id))
  }, [])

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

    // Pozisyon al (yerel öncelikli)
    const getPosition = (id: string, defaultPos: { x: number; y: number }) => {
      return localPositions[id] || customPositions[id] || defaultPos
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
          onPersonClick: (person: Person) => {
            // Koordinatör bilgilerini Person formatına dönüştür
            const coordinatorPerson: Person = {
              id: expandedCoordinatorData.coordinator?.name || `coord-${coordId}`,
              name: expandedCoordinatorData.coordinator?.name || expandedCoordinatorData.title,
              title: expandedCoordinatorData.coordinator?.title || 'Koordinatör',
              color: expandedCoordinatorData.coordinator?.color,
              jobDescription: expandedCoordinatorData.responsibilities?.join('\n') || '',
              // Coordinator interface'inde bu alanlar yok, ancak gösterim için boş bırakılabilir
              university: undefined,
              department: undefined,
            }
            setViewPersonCard({
              person: coordinatorPerson,
              coordinatorId: expandedCoordinatorData.id,
              subUnitId: '',
              coordinatorTitle: expandedCoordinatorData.title,
              subUnitTitle: 'Koordinatör',
              type: 'coordinator'
            })
          },
        },
      })

      // Deputy nodes - duplicate deputy.id'leri filtrele
      const uniqueDeputies = expandedCoordinatorData.deputies?.filter((deputy, idx, arr) => 
        arr.findIndex(d => d.id === deputy.id) === idx
      ) || []
      
      uniqueDeputies.forEach((deputy, idx) => {
        const xOffset = uniqueDeputies.length === 1 ? 0 :
          idx === 0 ? -150 : 150

        // Node ID olarak deputy.id kullan (unique ID garantisi için)
        const deputyNodeId = `detail-${coordId}-deputy-${deputy.id}`
        nodeList.push({
          id: deputyNodeId,
          type: 'detail',
          position: getPosition(deputyNodeId, { x: defaultBaseX + xOffset - 50, y: defaultBaseY + 120 }),
          draggable: !isLocked,
          data: {
            label: deputy.name,
            type: 'deputy',
            subtitle: deputy.title,
            coordinatorId: expandedCoordinatorData.id,
            deputyId: deputy.id,
            onPersonClick: (person: Person) => {
              // Deputy bilgilerini Person formatına dönüştür
              const deputyPerson: Person = {
                id: deputy.id,
                name: deputy.name,
                title: deputy.title,
                color: deputy.color,
                jobDescription: deputy.responsibilities?.join('\n') || '',
                // Deputy interface'inde bu alanlar yok, ancak gösterim için boş bırakılabilir
                university: undefined,
                department: undefined,
              }
              setViewPersonCard({
                person: deputyPerson,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: '',
                coordinatorTitle: expandedCoordinatorData.title,
                subUnitTitle: deputy.title || 'Koordinatör Yardımcısı',
                type: 'deputy'
              })
            },
            onPersonContextMenu: (e: React.MouseEvent, person: Person) => {
              e.preventDefault()
              e.stopPropagation()
              // Deputy bilgilerini Person formatına dönüştür
              const deputyPerson: Person = {
                id: deputy.id,
                name: deputy.name,
                title: deputy.title,
                color: deputy.color,
                jobDescription: deputy.responsibilities?.join('\n') || '',
                university: undefined,
                department: undefined,
              }
              setPersonContextMenu({
                x: e.clientX,
                y: e.clientY,
                person: deputyPerson,
                coordinatorId: expandedCoordinatorData.id,
                subUnitId: '',
                coordinatorTitle: expandedCoordinatorData.title,
                subUnitTitle: deputy.title || 'Koordinatör Yardımcısı',
                type: 'deputy',
                deputyId: deputy.id
              })
            },
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
            people: subUnit.people || [],
            responsibilities: Array.isArray(subUnit.responsibilities) ? subUnit.responsibilities.filter(r => r && r.trim()) : [],
            coordinatorId: expandedCoordinatorData.id,
            subUnitId: subUnit.id,
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

      // Coordinator to deputies - duplicate deputy.id'leri filtrele
      const uniqueDeputiesForEdges = expandedCoordinatorData.deputies?.filter((deputy, idx, arr) => 
        arr.findIndex(d => d.id === deputy.id) === idx
      ) || []
      
      uniqueDeputiesForEdges.forEach((deputy, idx) => {
        // Deputy node ID'si deputy.id kullanıyor
        const deputyNodeId = `detail-${coordId}-deputy-${deputy.id}`
        // Edge ID'yi unique yapmak için hem deputy.id hem de idx kullanıyoruz
        edgeList.push({
          id: `detail-coord-to-deputy-${coordId}-${deputy.id}-${idx}`,
          source: rootId,
          target: deputyNodeId,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })

      // Deputies to sub-units - unique deputy listesini kullan
      const deputies = uniqueDeputiesForEdges
      const deputyCount = deputies.length
      
      expandedCoordinatorData.subUnits?.forEach((_, idx) => {
        let sourceId = rootId
        if (deputyCount > 0 && deputies.length > 0) {
          const deputyIdx = idx % deputyCount
          const deputy = deputies[deputyIdx]
          if (deputy) {
            sourceId = `detail-${coordId}-deputy-${deputy.id}`
          }
        }

        edgeList.push({
          id: `detail-to-subunit-${coordId}-${idx}`,
          source: sourceId,
          target: `detail-${coordId}-subunit-${idx}`,
          type: 'smoothstep',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })

      // Deputies to people (or root to people) - unique deputy listesini kullan
      expandedCoordinatorData.people?.forEach((_, idx) => {
        let sourceId = rootId
        if (deputyCount > 0 && deputies.length > 0) {
          const deputyIdx = idx % deputyCount
          const deputy = deputies[deputyIdx]
          if (deputy) {
            sourceId = `detail-${coordId}-deputy-${deputy.id}`
          }
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

  // Firebase pozisyonu değişince yereli senkronize et
  useEffect(() => {
    if (!customPositions) {
      setLocalPositions({})
      return
    }
    // Firebase'den geleni mevcut yerel ile birleştir (detail pozisyonları kaybolmasın)
    setLocalPositions(prev => ({ ...prev, ...customPositions }))
  }, [customPositions])

  // Otomatik yerleşim seçim modal'ını aç
  const handleOpenAutoLayoutModal = useCallback(() => {
    setAutoLayoutSelectionModal(true)
  }, [])

  // Otomatik yerleşim internal fonksiyonu (dagre ile)
  const applyAutoLayoutInternal = useCallback((direction: 'TB' | 'LR' = 'TB', nodeIds?: string[]) => {
    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir: direction,
      // Çakışmayı engellemek için aralıkları artır
      nodesep: 240,
      ranksep: 260,
      ranker: 'tight-tree',
      marginx: 80,
      marginy: 80
    })
    g.setDefaultEdgeLabel(() => ({}))

    // Eğer belirli node'lar seçildiyse sadece onları işle, değilse tümünü işle
    const nodesToLayout = nodeIds && nodeIds.length > 0
      ? flowNodes.filter(node => nodeIds.includes(node.id))
      : flowNodes

    // Seçili node'lar için ilgili edge'leri bul
    const edgesToLayout = nodeIds && nodeIds.length > 0
      ? flowEdges.filter(edge => 
          nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
        )
      : flowEdges

    if (nodesToLayout.length === 0) return

    // Seçili node'lar ve edge'leri grafa ekle
    nodesToLayout.forEach(node => {
      const size = NODE_SIZE[node.type || 'default'] || NODE_SIZE.default
      g.setNode(node.id, { width: size.width, height: size.height })
    })

    edgesToLayout.forEach(edge => {
      g.setEdge(edge.source, edge.target)
    })

    dagre.layout(g)

    const newPositions: Record<string, { x: number; y: number }> = {}
    const updatedNodes = flowNodes.map(node => {
      if (!g.hasNode(node.id)) return node
      const { x, y } = g.node(node.id)
      const size = NODE_SIZE[node.type || 'default'] || NODE_SIZE.default
      const position = { x: x - size.width / 2, y: y - size.height / 2 }
      newPositions[node.id] = position
      return {
        ...node,
        position,
        positionAbsolute: undefined // React Flow yeniden hesaplasın
      }
    })

    setFlowNodes(updatedNodes)
    setLocalPositions(prev => ({ ...prev, ...newPositions }))
    updateFirebasePositions({ ...customPositions, ...newPositions })

    // Yerleşim sonrası tuvale odaklan (seçili node'lar varsa sadece onlara, değilse tümüne)
    requestAnimationFrame(() => {
      try {
        if (nodeIds && nodeIds.length > 0) {
          // Seçili node'lara zoom yap
          const selectedNodeElements = updatedNodes.filter(node => nodeIds.includes(node.id))
          
          if (selectedNodeElements.length > 0) {
            // React Flow fitView sadece tümüne uygulanır, node seçimi için getNodes kullan
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
          }
        } else {
          reactFlowInstance.fitView({ padding: 0.2 })
        }
      } catch (error) {
        console.warn('fitView başarısız:', error)
      }
    })
  }, [flowNodes, flowEdges, customPositions, updateFirebasePositions, reactFlowInstance, setFlowNodes])

  // Otomatik yerleşim - dagre ile (applyAutoLayoutInternal tanımlandıktan sonra)
  const applyAutoLayout = useCallback((direction: 'TB' | 'LR' = 'TB', skipWarning: boolean = false, nodeIds?: string[]) => {
    // Manuel pozisyonlar varsa uyarı göster (sadece kullanıcı butonuna bastığında ve tüm sayfa için)
    if (!skipWarning && (!nodeIds || nodeIds.length === 0)) {
      const hasManualPositions = Object.keys(customPositions || {}).length > 0 || Object.keys(localPositions).length > 0
      if (hasManualPositions) {
        setConfirmationModal({
          isOpen: true,
          title: 'Manuel Pozisyonlar Var',
          message: 'Manuel olarak ayarlanmış node pozisyonları var. Tüm sayfaya Oto Yerleştir uygulandığında bu pozisyonlar sıfırlanacak. Devam etmek istiyor musunuz?',
          confirmText: 'Evet, Devam Et',
          cancelText: 'İptal',
          type: 'warning',
          onConfirm: () => {
            setConfirmationModal(null)
            applyAutoLayoutInternal(direction, nodeIds)
          }
        })
        return // Modal açıldı, layout işlemi modal onayından sonra devam edecek
      }
    }
    
    applyAutoLayoutInternal(direction, nodeIds)
  }, [customPositions, localPositions, applyAutoLayoutInternal, setConfirmationModal])

  // Otomatik layout uygula (applyAutoLayout tanımlandıktan sonra)
  useEffect(() => {
    if (shouldAutoLayout) {
      // Kısa bir gecikme ile layout uygula (render'ın tamamlanmasını bekle)
      // Otomatik tetiklenen layout'larda uyarı gösterme (skipWarning: true)
      const timer = setTimeout(() => {
        applyAutoLayoutInternal('TB', undefined) // Otomatik tetiklenen layout'larda uyarı yok
        setShouldAutoLayout(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoLayout, applyAutoLayoutInternal])

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
        setLocalPositions(prev => ({ ...prev, [nodeId]: { x: change.position!.x, y: change.position!.y } }))
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

  // Koordinatörlüğe koordinatör kişisi ekle (coordinator.name)
  const handleAddCoordinatorPerson = () => {
    if (contextMenu) {
      setFormModal({
        isOpen: true,
        type: 'coordinator',
        title: 'Koordinatör Ekle',
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
        setShouldAutoLayout(true)
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
        setShouldAutoLayout(true)
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
        setShouldAutoLayout(true)
      }
      setContextMenu(null)
    }
  }

  const handleEdit = () => {
    if (contextMenu) {
      // Detay node ise gerçek ID'yi çözümle
      let targetId = contextMenu.nodeId
      if (targetId.startsWith('detail-') && targetId.endsWith('-root')) {
        targetId = targetId.replace('detail-', '').replace('-root', '')
      }

      const coord = data.coordinators.find(c => c.id === targetId)
      const mainCoord = data.mainCoordinators.find(m => m.id === targetId)
      const item = coord || mainCoord

      setFormModal({
        isOpen: true,
        type: 'edit',
        title: 'Düzenle',
        nodeId: targetId,
        initialData: item ? {
          title: coord?.title || mainCoord?.title || '',
          description: coord?.description || mainCoord?.description || '',
        } : undefined
      })
    }
  }

  const handleDelete = () => {
    if (!contextMenu) return
    
    setConfirmationModal({
      isOpen: true,
      title: 'Birimi Sil',
      message: 'Bu birimi silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      type: 'danger',
      onConfirm: () => {
        setConfirmationModal(null)
        let targetId = contextMenu.nodeId
        let targetType = contextMenu.nodeType

        // Detay node ise gerçek ID ve tip çözümlemesi
        if (targetId.startsWith('detail-') && targetId.endsWith('-root')) {
          targetId = targetId.replace('detail-', '').replace('-root', '')
          // Detay görünümü sadece koordinatörler için var, tipini bulalım
          if (data.coordinators.find(c => c.id === targetId)) {
            targetType = 'coordinator'
          } else if (data.mainCoordinators.find(c => c.id === targetId)) {
            targetType = 'mainCoordinator'
          }

          // Eğer açık olan koordinatör siliniyorsa detay panelini kapat
          if (expandedCoordinator === targetId) {
            setExpandedCoordinator(null)
          }
        }

        deleteNode(targetId, targetType)
        setContextMenu(null)
        // Silme işleminden sonra otomatik layout uygula
        setShouldAutoLayout(true)
        showToast('Birim başarıyla silindi', 'success')
      }
    })
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
      showToast('PNG dışa aktarma başarısız oldu', 'error')
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
      showToast('SVG dışa aktarma başarısız oldu', 'error')
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
      showToast('PDF dışa aktarma başarısız oldu', 'error')
    }
  }, [currentProjectName])

  // Form save guard - çift çağrıyı önlemek için
  const formSaveInProgressRef = useRef(false)
  // Silme işlemi guard - çift silmeyi önlemek için
  const deleteInProgressRef = useRef<Set<string>>(new Set())

  const handleFormSave = useCallback((formData: any) => {
    // Çift çağrıyı önle
    if (formSaveInProgressRef.current) {
      return
    }

    // formModal state'ini closure'dan al (en son değer)
    const currentModal = formModal
    if (!currentModal) return

    // Guard'ı aktif et
    formSaveInProgressRef.current = true

    const shouldAutoLayoutAfter = ['coordinator', 'subunit', 'deputy', 'person'].includes(currentModal.type)

    try {
      switch (currentModal.type) {
        case 'edit':
          updateCoordinator(currentModal.nodeId, {
            title: formData.title,
            description: formData.description,
          })
          break
        case 'coordinator':
          // Koordinatörlüğe koordinatör kişisi ekle (coordinator.name)
          updateCoordinator(currentModal.nodeId, {
            coordinator: {
              name: formData.name,
              title: formData.title || 'Koordinatör',
            },
            hasDetailPage: true, // Detay sayfasını etkinleştir
          })
          if (shouldAutoLayoutAfter) setShouldAutoLayout(true)
          break
        case 'subunit':
          // Eğer initialData.id veya formData.id varsa, bu bir güncelleme işlemi
          const subUnitIdToUpdate = currentModal.initialData?.id || formData.id
          if (subUnitIdToUpdate) {
            // Mevcut birimi güncelle
            const responsibilitiesArray = Array.isArray(formData.responsibilities)
              ? formData.responsibilities.filter((r: string) => r && String(r).trim())
              : []
            
            updateSubUnit(currentModal.nodeId, subUnitIdToUpdate, {
              title: formData.title,
              description: formData.description || '',
              responsibilities: responsibilitiesArray,
            })
            // Koordinatörü tekrar expand et (güncellenmiş verilerin görünmesi için)
            setTimeout(() => {
              setExpandedCoordinator(currentModal.nodeId)
              setShouldAutoLayout(true)
            }, 200)
          } else {
            // Yeni birim ekle - addSubUnit fonksiyonu zaten duplicate kontrolü yapıyor
            const responsibilitiesArrayNew = Array.isArray(formData.responsibilities)
              ? formData.responsibilities.filter((r: string) => r && String(r).trim())
              : []
            
            addSubUnit(currentModal.nodeId, {
              title: formData.title,
              people: [],
              responsibilities: responsibilitiesArrayNew,
              description: formData.description || '',
            })
            // Koordinatörü expand et (yeni birimin görünmesi için)
            setTimeout(() => {
              setExpandedCoordinator(currentModal.nodeId)
              setShouldAutoLayout(true)
            }, 100)
          }
          break
        case 'deputy':
          // Önce koordinatörü expand et (deputy node'larının görünmesi için)
          setExpandedCoordinator(currentModal.nodeId)
          
          // addDeputy fonksiyonu zaten duplicate kontrolü yapıyor
          addDeputy(currentModal.nodeId, {
            name: formData.name,
            title: formData.title || '',
            responsibilities: formData.responsibilities || [],
          })
          
          // Deputy eklendikten sonra koordinatörü tekrar expand et (data güncellendikten sonra)
          setTimeout(() => {
            setExpandedCoordinator(currentModal.nodeId)
          }, 100)
          
          if (shouldAutoLayoutAfter) setShouldAutoLayout(true)
          break
        case 'responsibility':
          formData.responsibilities?.forEach((resp: string) => {
            if (resp.trim()) {
              addResponsibility(currentModal.nodeId, resp)
            }
          })
          break
        case 'person':
          if (formData.subUnitId && formData.name) {
            // addPerson fonksiyonu zaten duplicate kontrolü yapıyor
            addPerson(currentModal.nodeId, formData.subUnitId, {
              name: formData.name,
              title: formData.title || '',
            })
            if (shouldAutoLayoutAfter) setShouldAutoLayout(true)
          }
          break
        case 'edit-person':
          if (formData.personId && formData.subUnitId) {
            updatePerson(currentModal.nodeId, formData.subUnitId, formData.personId, {
              name: formData.name,
              title: formData.title || '',
              university: formData.university || '',
              department: formData.department || '',
              jobDescription: formData.jobDescription || '',
            })
          }
          break
      }

      // Modal'ı hemen kapat (çift çağrıyı önlemek için)
      setFormModal(null)
    } finally {
      // Guard'ı gecikmeyle sıfırla
      setTimeout(() => {
        formSaveInProgressRef.current = false
      }, 1000)
    }
  }, [formModal, expandedCoordinator, addDeputy, addSubUnit, addPerson, addResponsibility, updateCoordinator, updatePerson, setShouldAutoLayout, setExpandedCoordinator])

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
          onSelectionChange={handleSelectionChange}
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
                  // Mevcut node pozisyonlarını al ve kaydet (detail dahil)
                  const currentPositions: Record<string, { x: number; y: number }> = {}
                  flowNodes.forEach(node => {
                    currentPositions[node.id] = { x: node.position.x, y: node.position.y }
                  })
                  const merged = { ...customPositions, ...currentPositions }
                  setLocalPositions(merged)
                  updateFirebasePositions(merged)
                              showToast('Pozisyonlar kaydedildi!', 'success')
                }}
                className="backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform bg-blue-50 border-blue-200"
                title="Pozisyonları Kaydet"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
            )}

            {/* Undo/Redo ve Otomatik yerleşim */}
            <div className="flex items-center gap-2">
              {/* Geri Al (Undo) */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform ${
                  historyIndex <= 0
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
                title="Geri Al (Ctrl+Z)"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>

              {/* İleri Al (Redo) */}
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform ${
                  historyIndex >= history.length - 1
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
                title="İleri Al (Ctrl+Y)"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>

              {/* Otomatik yerleşim */}
              <button
                onClick={handleOpenAutoLayoutModal}
                className="backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform bg-emerald-50 border-emerald-200"
                title="Oto Yerleştir - Bağlantılara göre otomatik konumlandır"
              >
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v4a2 2 0 002 2h2a2 2 0 002-2V3m0 18v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4M4 9h4a2 2 0 012 2v2a2 2 0 01-2 2H4m16-6h-4a2 2 0 00-2 2v2a2 2 0 002 2h4" />
                </svg>
              </button>
            </div>

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
          onAddCoordinatorPerson={handleAddCoordinatorPerson}
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
                {viewPersonCard.person.cvFileName || viewPersonCard.person.cvData ? (
                  <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3 text-center">
                    <svg className="w-6 h-6 mx-auto text-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-green-600 font-medium">{viewPersonCard.person.cvFileName || 'CV Yüklü'}</p>
                    {viewPersonCard.person.cvData && (
                      <a
                        href={viewPersonCard.person.cvData}
                        download={viewPersonCard.person.cvFileName || 'cv.pdf'}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        CV'yi İndir
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                    <svg className="w-6 h-6 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-gray-400">CV yüklenmemiş</p>
                  </div>
                )}
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
              <p className="text-xs text-gray-400">
                {personContextMenu.type === 'deputy' ? 'Koordinatör Yardımcısı' : 'Personel'}
              </p>
              <p className="text-sm font-semibold text-gray-800 truncate">{personContextMenu.person.name}</p>
            </div>
            {personContextMenu.type !== 'deputy' && (
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
            )}
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
                  const confirmMessage = personContextMenu.type === 'deputy' 
                    ? `${personContextMenu.person.name} adlı koordinatör yardımcısını silmek istediğinize emin misiniz?`
                    : `${personContextMenu.person.name} adlı personeli silmek istediğinize emin misiniz?`
                  
                  setConfirmationModal({
                    isOpen: true,
                    title: personContextMenu.type === 'deputy' ? 'Koordinatör Yardımcısını Sil' : 'Personeli Sil',
                    message: confirmMessage,
                    confirmText: 'Evet, Sil',
                    cancelText: 'İptal',
                    type: 'danger',
                    onConfirm: () => {
                      setConfirmationModal(null)
                      // Çift silmeyi önle
                      const deleteKey = personContextMenu.type === 'deputy' 
                        ? `deputy-${personContextMenu.coordinatorId}-${personContextMenu.deputyId}`
                        : `person-${personContextMenu.coordinatorId}-${personContextMenu.subUnitId}-${personContextMenu.person.id}`
                      
                      if (deleteInProgressRef.current.has(deleteKey)) {
                        setPersonContextMenu(null)
                        return
                      }

                      deleteInProgressRef.current.add(deleteKey)

                      try {
                        if (personContextMenu.type === 'deputy' && personContextMenu.deputyId && personContextMenu.coordinatorId) {
                          // Deputy silme - sadece belirtilen deputy ID'sini sil
                          const coordinator = data.coordinators.find(c => c.id === personContextMenu.coordinatorId)
                          const deputyToDelete = coordinator?.deputies?.find(d => d.id === personContextMenu.deputyId)
                          if (deputyToDelete) {
                            deleteDeputy(personContextMenu.coordinatorId, personContextMenu.deputyId)
                            setShouldAutoLayout(true)
                            showToast('Koordinatör yardımcısı başarıyla silindi', 'success')
                          }
                        } else if (personContextMenu.type !== 'deputy') {
                          // Person silme
                          deletePerson(personContextMenu.coordinatorId, personContextMenu.subUnitId, personContextMenu.person.id)
                          setShouldAutoLayout(true)
                          showToast('Personel başarıyla silindi', 'success')
                        }
                      } finally {
                        setTimeout(() => {
                          deleteInProgressRef.current.delete(deleteKey)
                        }, 500)
                      }
                      
                      setPersonContextMenu(null)
                    }
                  })
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

        {/* SubUnit Context Menu */}
        {subUnitContextMenu && (
          <div
            className="fixed z-[300] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{ left: subUnitContextMenu.x, top: subUnitContextMenu.y }}
            onClick={() => setSubUnitContextMenu(null)}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400">Alt Birim</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{subUnitContextMenu.subUnitTitle}</p>
            </div>

            <button
              onClick={() => {
                setFormModal({
                  isOpen: true,
                  type: 'person',
                  title: 'Kişi Ekle',
                  nodeId: subUnitContextMenu.coordinatorId,
                  initialData: {
                    subUnitId: subUnitContextMenu.subUnitId
                  }
                })
                setSubUnitContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Kişi Ekle
            </button>

            <button
              onClick={() => {
                // Mevcut birim bilgilerini bul
                const coordinator = data.coordinators.find(c => c.id === subUnitContextMenu.coordinatorId)
                const existingSubUnit = coordinator?.subUnits?.find(su => su.id === subUnitContextMenu.subUnitId)
                
                setFormModal({
                  isOpen: true,
                  type: 'subunit',
                  title: 'Birim Düzenle',
                  nodeId: subUnitContextMenu.coordinatorId,
                  initialData: {
                    id: subUnitContextMenu.subUnitId,
                    title: existingSubUnit?.title || subUnitContextMenu.subUnitTitle,
                    description: existingSubUnit?.description || '',
                    responsibilities: existingSubUnit?.responsibilities || []
                  }
                })
                setSubUnitContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Düzenle
            </button>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setConfirmationModal({
                    isOpen: true,
                    title: 'Birimi Sil',
                    message: `${subUnitContextMenu.subUnitTitle} birimini silmek istediğinize emin misiniz?`,
                    confirmText: 'Evet, Sil',
                    cancelText: 'İptal',
                    type: 'danger',
                    onConfirm: () => {
                      setConfirmationModal(null)
                      // Çift silmeyi önle
                      const deleteKey = `subunit-${subUnitContextMenu.coordinatorId}-${subUnitContextMenu.subUnitId}`
                      
                      if (deleteInProgressRef.current.has(deleteKey)) {
                        setSubUnitContextMenu(null)
                        return
                      }

                      deleteInProgressRef.current.add(deleteKey)

                      try {
                        deleteSubUnit(subUnitContextMenu.coordinatorId, subUnitContextMenu.subUnitId)
                        setShouldAutoLayout(true)
                        showToast('Birim başarıyla silindi', 'success')
                      } finally {
                        setTimeout(() => {
                          deleteInProgressRef.current.delete(deleteKey)
                        }, 500)
                      }
                      
                      setSubUnitContextMenu(null)
                    }
                  })
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

        {/* Confirmation Modal */}
        {confirmationModal && (
          <ConfirmationModal
            isOpen={confirmationModal.isOpen}
            title={confirmationModal.title}
            message={confirmationModal.message}
            confirmText={confirmationModal.confirmText}
            cancelText={confirmationModal.cancelText}
            type={confirmationModal.type}
            onConfirm={confirmationModal.onConfirm}
            onCancel={() => setConfirmationModal(null)}
          />
        )}

        {/* Auto Layout Selection Modal */}
        <AutoLayoutSelectionModal
          isOpen={autoLayoutSelectionModal}
          hasSelectedNodes={selectedNodes.length > 0}
          selectedCount={selectedNodes.length}
          onSelectSelected={() => {
            setAutoLayoutSelectionModal(false)
            applyAutoLayout('TB', false, selectedNodes)
            showToast(`${selectedNodes.length} adet node için oto yerleştir uygulandı`, 'success')
          }}
          onSelectAll={() => {
            setAutoLayoutSelectionModal(false)
            applyAutoLayout('TB', false) // Tüm sayfa için uyarı gösterilecek
          }}
          onCancel={() => setAutoLayoutSelectionModal(false)}
        />

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

