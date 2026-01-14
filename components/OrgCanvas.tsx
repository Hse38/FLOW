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
  EdgeChange,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'

import ChairmanNode from './nodes/ChairmanNode'
import ExecutiveNode from './nodes/ExecutiveNode'
import MainCoordinatorNode from './nodes/MainCoordinatorNode'
import SubCoordinatorNode from './nodes/SubCoordinatorNode'
import UnitNode from './nodes/UnitNode'
import DetailNode from './nodes/DetailNode'
import TurkeyMapNode from './nodes/TurkeyMapNode'
import ManualEdge from './edges/ManualEdge'
import ContextMenu from './ContextMenu'
import FormModal from './FormModal'
import PersonDetailModal from './PersonDetailModal'
import LinkToMainSchemaModal from './LinkToMainSchemaModal'
import RightDetailPanel from './RightDetailPanel'
import TurkeyMapPanel from './TurkeyMapPanel'
import ConfirmationModal from './ConfirmationModal'
import AutoLayoutSelectionModal from './AutoLayoutSelectionModal'
import PersonnelPanel from './PersonnelPanel'
import SubUnitDeputyChangeModal from './SubUnitDeputyChangeModal'
import SubUnitSelectionModal from './SubUnitSelectionModal'
import AddPersonSelectionModal from './AddPersonSelectionModal'
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
  turkeyMap: TurkeyMapNode,
}

const edgeTypes = {
  manual: ManualEdge,
  default: ManualEdge, // Use manual edge as default
}

// Basit node boyutları - dagre yerleşimi için (güncellenmiş boyutlar)
const NODE_SIZE: Record<string, { width: number; height: number }> = {
  chairman: { width: 500, height: 140 }, // Daha dikdörtgen (geniş, kısa)
  executive: { width: 450, height: 120 }, // Daha dikdörtgen (geniş, kısa)
  mainCoordinator: { width: 600, height: 120 }, // Daha dikdörtgen (geniş, kısa) - özellikle T3 Vakfı/Teknofest için
  subCoordinator: { width: 600, height: 140 }, // Text taşmasını önlemek için yükseklik artırıldı
  detail: { width: 550, height: 180 }, // Açılır node'lar için daha dikdörtgen (geniş, kısa)
  unit: { width: 320, height: 160 }, // Text taşmasını önlemek için yükseklik artırıldı
  default: { width: 280, height: 140 }
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
    addSubUnitResponsibility,
    addCoordinator,
    deleteCoordinator,
    deleteNode,
    updateCoordinator,
    addManagement,
    addExecutive,
    updateExecutive,
    addMainCoordinator,
    updatePerson,
    addPerson,
    deletePerson,
    movePerson,
    deleteDeputy,
    deleteSubUnit,
    updateSubUnit,
    addCityPerson,
    updateCityPerson,
    deleteCityPerson,
    getCityPersonnel,
    getAllPersonnel,
    linkSchemaToCoordinator,
    restoreData,
    saveData,
    // Firebase senkronizasyon
    isLocked: firebaseLocked,
    setLocked: setFirebaseLocked,
    positions: firebasePositions,
    updatePositions: updateFirebasePositions,
    customConnections: firebaseConnections,
    addConnection: addFirebaseConnection,
    removeConnection: removeFirebaseConnection,
    updateConnection: updateFirebaseConnection,
    isLoading
  } = useOrgData()
  const reactFlowInstance = useReactFlow()

  // Undo/Redo history
  const [history, setHistory] = useState<OrgData[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [shouldAutoLayout, setShouldAutoLayout] = useState<boolean>(false)
  const hasAutoLayoutRunRef = useRef<boolean>(false)
  
  // Klavuz çizgileri (Snap to Grid) - varsayılan olarak açık
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true)
  
  // Expansion info for node shifting
  const expandedNodeInfoRef = useRef<{
    coordId: string
    parentBottomY: number
    expandedContentHeight: number
  } | null>(null)

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
      // MANUEL KONTROL: Otomatik layout devre dışı
    }
  }, [history, historyIndex, restoreData])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && history.length > 0) {
      isUndoRedoRef.current = true
      const nextData = history[historyIndex + 1]
      restoreData(nextData)
      setHistoryIndex(prev => prev + 1)
      // MANUEL KONTROL: Otomatik layout devre dışı
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


  // FIXED EXPANSION STATE: Save expanded coordinator to localStorage for persistence
  // Load from localStorage on mount, save on change
  const [expandedCoordinator, setExpandedCoordinatorState] = useState<string | null>(() => {
    // Load from localStorage on initial mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedCoordinator')
      return saved || null
    }
    return null
  })
  
  // Wrapper to save to localStorage when expanded coordinator changes
  const setExpandedCoordinator = useCallback((value: string | null | ((prev: string | null) => string | null)) => {
    setExpandedCoordinatorState((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value
      // Save to localStorage
      if (typeof window !== 'undefined') {
        if (newValue) {
          localStorage.setItem('expandedCoordinator', newValue)
        } else {
          localStorage.removeItem('expandedCoordinator')
        }
      }
      return newValue
    })
  }, [])

  // Sağ panel için seçili koordinatör
  const [rightPanelCoordinatorId, setRightPanelCoordinatorId] = useState<string | null>(null)

  // Türkiye Haritası Sol Panel (Toplumsal Çalışmalar için)
  const [turkeyMapOpen, setTurkeyMapOpen] = useState<boolean>(false)
  // Türkiye Haritası - Node altında gösterim (Toplumsal Çalışmalar için)
  // FIXED STATE: Harita (Küre) her zaman görünür - Toplumsal Çalışmalar'ın yanında
  const [turkeyMapExpanded, setTurkeyMapExpanded] = useState<boolean>(true)
  // İl personel modalı
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [cityPersonnelModalOpen, setCityPersonnelModalOpen] = useState<boolean>(false)

  // Personel Paneli (yan menü)
  const [personnelPanelOpen, setPersonnelPanelOpen] = useState<boolean>(false)

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
    type: 'subunit' | 'deputy' | 'responsibility' | 'person' | 'edit' | 'edit-person' | 'coordinator' | 'city-person'
    title: string
    nodeId: string
    initialData?: any
    deputies?: Array<{ id: string; name: string; title: string; color?: string }>
  } | null>(null)

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
    city?: string
    type?: 'person' | 'coordinator' | 'deputy' | 'subunit-person' | 'city-person'
    role?: 'ilSorumlusu' | 'deneyapSorumlusu' // Şehir personeli için role
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

  // Birim koordinatör yardımcısı değiştirme modal
  const [subUnitDeputyChangeModal, setSubUnitDeputyChangeModal] = useState<{
    coordinatorId: string
    subUnitId: string
    subUnitTitle: string
  } | null>(null)

  // Personel ekleme seçim modal (var olan / yeni)
  const [addPersonSelectionModal, setAddPersonSelectionModal] = useState<{
    coordinatorId: string
    subUnitId: string
  } | null>(null)

  // Birim seçim modal (Personel Ata için)
  const [subUnitSelectionModal, setSubUnitSelectionModal] = useState<{
    coordinatorId: string
    coordinatorTitle: string
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
        sourceHandle: conn.sourceHandle || 'bottom-source',
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
    // MANUEL BAĞLANTI MODU: Aktif - hedef node seçildi
    if (connectionMode.active && connectionMode.sourceId) {
      if (connectionMode.sourceId !== unitId) {
        // Hedef node seçildi - target handle seçimi için modal aç
        setPendingTarget({ targetId: unitId })
        // Node bilgisini bul
        const node = flowNodes.find(n => n.id === unitId)
        setConnectionHandleModal({
          isOpen: true,
          nodeId: unitId,
          nodeName: (node?.data?.label || unitId) as string
        })
      } else {
        // Aynı node'a tıklandı - iptal et
        setConnectionMode({ active: false, sourceId: null, sourceName: null, sourceHandle: 'bottom' })
        showToast('Bağlantı modu iptal edildi.', 'info')
      }
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

    // FIXED POSITION RESOLUTION: SADECE KAYDEDİLMİŞ POZİSYONLAR
    // Priority: Firebase saved positions > Local positions > Default from data
    // CRITICAL: Sadece Firebase'de kaydedilmiş pozisyonlar kullanılır
    // Otomatik calculated position YOK - sadece manuel kaydedilmiş pozisyonlar
    const getPosition = (id: string, defaultPos: { x: number; y: number }) => {
      // 1. Firebase saved positions (highest priority - persistent across sessions)
      // Bu pozisyonlar "Firebase'e Kaydet" butonu ile kaydedilmiş pozisyonlardır
      if (customPositions[id]) {
        return customPositions[id]
      }
      // 2. Local positions (during current session drag operations - geçici)
      if (localPositions[id]) {
        return localPositions[id]
      }
      // 3. Default position from org.json (only if no saved position exists)
      // Eğer Firebase'de pozisyon yoksa, org.json'daki default pozisyonu kullan
      // Calculated position YOK - sadece kaydedilmiş veya default pozisyon
      return defaultPos
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
          id: exec.id, // ID'yi de geç (renk kontrolü için)
        },
      })
    })

    // Toplumsal Çalışmalar için harita node'unu ekle (expanded ise)
    if (turkeyMapExpanded) {
      const toplumsalNode = data.executives.find(e => e.id === 'toplumsal-calismalar')
      if (toplumsalNode) {
        const mapPosition = getPosition('turkey-map-node', {
          x: toplumsalNode.position.x - 800,
          y: toplumsalNode.position.y + 180
        })
        nodeList.push({
          id: 'turkey-map-node',
          type: 'turkeyMap',
          position: mapPosition,
          draggable: !isLocked,
          data: {
            id: 'turkey-map-node',
            onCityClick: (cityName: string) => {
              // Artık modal açmıyoruz, node içinde gösteriliyor
            },
            cityPersonnel: getCityPersonnel(),
            onAddPerson: (city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', person: Omit<Person, 'id'>) => {
              addCityPerson(city, role, person)
            },
            onUpdatePerson: (city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', personId: string, updates: Partial<Person>) => {
              updateCityPerson(city, role, personId, updates)
            },
            onDeletePerson: (city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', personId: string) => {
              deleteCityPerson(city, role, personId)
            },
          },
        })
      }
    }

    // Main coordinator ID'lerini kaydet (duplicate kontrolü için)
    const mainCoordinatorIds = new Set(data.mainCoordinators.map(c => c.id))

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

    // Add sub-coordinators (main coordinator ve executive ile çakışanları atla)
    // Create set of executive IDs to prevent duplicates
    const executiveIds = new Set(data.executives.map(exec => exec.id))
    
    data.coordinators.forEach((coord) => {
      // Main coordinator ile aynı ID'ye sahipse atla (duplicate önleme)
      if (mainCoordinatorIds.has(coord.id)) {
        // Silent skip - duplicate önleme (uyarı kaldırıldı, normal davranış)
        return
      }
      
      // Executive ile aynı ID'ye sahipse atla (duplicate önleme)
      if (executiveIds.has(coord.id)) {
        // Silent skip - duplicate önleme (uyarı kaldırıldı, normal davranış)
        return
      }

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

    // INLINE VERTICAL EXPANSION: Child nodes in single column directly below parent
    // STRICT RULES: Parent stays FIXED, expansion is TOP → DOWN only, no horizontal movement
    if (expandedCoordinatorData) {
      const coordId = expandedCoordinatorData.id
      const mainCoordNode = nodeList.find(n => n.id === coordId)
      const mainCoordPosition = mainCoordNode?.position || getPosition(coordId, expandedCoordinatorData.position)
      
      // Node yüksekliğini al
      const nodeHeight = NODE_SIZE['subCoordinator']?.height || 140
      
      // INLINE EXPANSION: Anchor to parent's bottom edge, same X position (NO horizontal offset)
      // Parent node X position is LOCKED - expanded content aligns directly below
      const defaultBaseX = mainCoordPosition.x // Same X as parent (strictly vertical)
      const defaultBaseY = mainCoordPosition.y + nodeHeight + 80 // Parent'ın alt kenarından 80px mesafe
      
      // UNIFORM VERTICAL SPACING: Her child node arasında sabit mesafe
      const verticalSpacing = 200 // Child node'lar arası dikey mesafe
      let currentY = defaultBaseY // Mevcut Y pozisyonu (her child'tan sonra artacak)

      // Koordinatör root node - direkt parent'ın altında, ortalanmış
      // FIXED: Expanded node pozisyonları - kaydedilmiş pozisyon varsa onu kullan, yoksa hesaplanan
      const rootId = `detail-${coordId}-root`
      const rootNodeHeight = NODE_SIZE['detail']?.height || 180
      
      // Expanded node pozisyonları: Önce kaydedilmiş pozisyon, yoksa hesaplanan pozisyon
      const rootPosition = getPosition(rootId, { x: defaultBaseX, y: currentY })
      
      nodeList.push({
        id: rootId,
        type: 'detail',
        position: rootPosition, // getPosition zaten öncelik sırasına göre pozisyon döndürüyor
        draggable: !isLocked,
        data: {
          // YÖNETİME BAĞLI BİRİMLER için özel yazı
          label: coordId === 'yonetime-bagli-birimler' ? 'YÖNETİME BAĞLI BİRİMLER' : expandedCoordinatorData.title,
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
      
      // Root node'dan sonra Y pozisyonunu güncelle
      currentY += rootNodeHeight + verticalSpacing

      // Deputy nodes - SINGLE COLUMN VERTICAL STACK
      const uniqueDeputies = expandedCoordinatorData.deputies?.filter((deputy, idx, arr) => 
        arr.findIndex(d => d.id === deputy.id) === idx
      ) || []
      
      uniqueDeputies.forEach((deputy) => {
        const deputyNodeId = `detail-${coordId}-deputy-${deputy.id}`
        const deputyNodeHeight = NODE_SIZE['detail']?.height || 180
        
        // VERTICAL STACK: Her deputy bir öncekinin altında, ortalanmış
        nodeList.push({
          id: deputyNodeId,
          type: 'detail',
          position: getPosition(deputyNodeId, { x: defaultBaseX, y: currentY }), // getPosition öncelik sırasına göre pozisyon döndürüyor
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
                subUnitTitle: 'Koordinatör Yardımcısı', // Seviye etiketi (görev/unvan değil)
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
                subUnitTitle: 'Koordinatör Yardımcısı', // Seviye etiketi (görev/unvan değil)
                type: 'deputy',
                deputyId: deputy.id
              })
            },
          },
        })
        
        // Y pozisyonunu güncelle (bir sonraki node için)
        currentY += deputyNodeHeight + verticalSpacing
      })

      // Sub-unit nodes - SPECIAL LAYOUT FOR "İdari İşler Koordinatörlüğü"
      // For "idari-isler": HORIZONTAL ROW layout (5 units side by side)
      // For others: VERTICAL STACK layout (default)
      const isIdariIsler = coordId === 'idari-isler'
      
      if (isIdariIsler && expandedCoordinatorData.subUnits && expandedCoordinatorData.subUnits.length > 0) {
        // HORIZONTAL ROW LAYOUT for İdari İşler
        const subUnitCount = expandedCoordinatorData.subUnits.length
        const subUnitNodeWidth = 500 // Her birim node genişliği
        const horizontalSpacing = 100 // Birimler arası yatay boşluk
        const totalWidth = (subUnitCount * subUnitNodeWidth) + ((subUnitCount - 1) * horizontalSpacing)
        const startX = defaultBaseX - (totalWidth / 2) + (subUnitNodeWidth / 2) // Ortalanmış başlangıç
        
        // Calculate positions for all sub-units
        const subUnitPositions: Record<string, { x: number; y: number }> = {}
        
        expandedCoordinatorData.subUnits.forEach((subUnit, index) => {
          const subUnitNodeId = `detail-${coordId}-subunit-${subUnit.id}`
          const subUnitX = startX + (index * (subUnitNodeWidth + horizontalSpacing))
          
          // HORIZONTAL ROW: Her subUnit yan yana, aynı Y seviyesinde
          const calculatedPosition = { x: subUnitX, y: currentY }
          const finalPosition = getPosition(subUnitNodeId, calculatedPosition)
          
          // Store calculated position for Firebase save
          subUnitPositions[subUnitNodeId] = calculatedPosition
          
          nodeList.push({
            id: subUnitNodeId,
            type: 'detail',
            position: finalPosition,
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
        
        // Save calculated positions to Firebase if they don't exist
        // This ensures the horizontal layout is persisted
        const positionsToSave: Record<string, { x: number; y: number }> = {}
        Object.keys(subUnitPositions).forEach(nodeId => {
          // Only save if position doesn't exist in Firebase
          if (!customPositions[nodeId] && !localPositions[nodeId]) {
            positionsToSave[nodeId] = subUnitPositions[nodeId]
          }
        })
        
        // Save to Firebase if there are new positions
        if (Object.keys(positionsToSave).length > 0) {
          // Use setTimeout to avoid blocking render
          setTimeout(() => {
            const allPositions = { ...customPositions, ...positionsToSave }
            updateFirebasePositions(allPositions)
            console.log('💾 İdari İşler sub-unit pozisyonları Firebase\'e kaydedildi:', Object.keys(positionsToSave))
          }, 1000)
        }
        
        // Y pozisyonunu güncelle (bir sonraki node için - sadece en yüksek node için)
        const maxSubUnitHeight = NODE_SIZE['detail']?.height || 180
        currentY += maxSubUnitHeight + verticalSpacing
      } else {
        // DEFAULT VERTICAL STACK LAYOUT for other coordinators
        expandedCoordinatorData.subUnits?.forEach((subUnit) => {
          const subUnitNodeId = `detail-${coordId}-subunit-${subUnit.id}`
          const subUnitNodeHeight = NODE_SIZE['detail']?.height || 180
          
          // VERTICAL STACK: Her subUnit bir öncekinin altında, ortalanmış
          nodeList.push({
            id: subUnitNodeId,
            type: 'detail',
            position: getPosition(subUnitNodeId, { x: defaultBaseX, y: currentY }), // getPosition öncelik sırasına göre pozisyon döndürüyor
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
          
          // Y pozisyonunu güncelle (bir sonraki node için)
          currentY += subUnitNodeHeight + verticalSpacing
        })
      }

      // People nodes (direct employees) - SINGLE COLUMN VERTICAL STACK
      expandedCoordinatorData.people?.forEach((person) => {
        const personNodeId = `detail-${coordId}-person-${person.id || `person-${Date.now()}`}`
        const personNodeHeight = NODE_SIZE['detail']?.height || 180
        
        // VERTICAL STACK: Her person bir öncekinin altında, ortalanmış
        nodeList.push({
          id: personNodeId,
          type: 'detail',
          position: getPosition(personNodeId, { x: defaultBaseX, y: currentY }), // getPosition öncelik sırasına göre pozisyon döndürüyor
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
        
        // Y pozisyonunu güncelle (bir sonraki node için)
        currentY += personNodeHeight + verticalSpacing
      })
      
      // INLINE VERTICAL EXPANSION: Calculate total height of expanded content
      // This height is used to shift other nodes DOWN (no horizontal movement)
      const expandedContentHeight = currentY - defaultBaseY + 100 // Add padding at bottom
      
      // SHIFT OTHER NODES DOWN: All nodes below the expanded content must move down
      // CRITICAL: Only shift nodes WITHOUT saved positions - preserve manual positions exactly
      // Parent node's bottom edge is the reference point
      const parentBottomY = mainCoordPosition.y + nodeHeight
      
      // Process all nodes to shift them down if they're below the expanded content
      nodeList.forEach(node => {
        // Skip expanded content nodes (they're already positioned)
        if (node.id.startsWith(`detail-${coordId}-`)) return
        // Skip parent node (it stays FIXED)
        if (node.id === coordId) return
        
        // STRICT VERTICAL SHIFT: Only shift nodes that are below the parent
        // NO horizontal movement - X position stays exactly the same
        const nodeY = node.position.y
        if (nodeY > parentBottomY) {
          const savedPosition = getPosition(node.id, node.position)
          // CRITICAL: Only shift if NO saved position exists (preserve ALL manual positions)
          // Saved positions (Firebase or local) are NEVER modified - they are pixel-perfect
          if (!customPositions[node.id] && !localPositions[node.id]) {
            // VERTICAL SHIFT ONLY: Y increases, X stays the same
            // This only applies to nodes without saved positions (default positions from org.json)
            node.position = {
              x: savedPosition.x, // X position LOCKED (no horizontal movement)
              y: savedPosition.y + expandedContentHeight // Shift DOWN only
            }
          }
          // If node has saved position, it stays EXACTLY where it was saved - no shifting
        }
      })
    }

    // Duplicate ID kontrolü ve filtreleme - daha güçlü kontrol
    const seenIds = new Map<string, { node: Node; index: number }[]>()
    
    // Tüm node'ları ID'ye göre grupla
    nodeList.forEach((node, index) => {
      const existing = seenIds.get(node.id) || []
      existing.push({ node, index })
      seenIds.set(node.id, existing)
    })
    
    // Duplicate ID'leri bul ve unique hale getir
    const duplicateIds = Array.from(seenIds.entries()).filter(([_, nodes]) => nodes.length > 1)
    
    if (duplicateIds.length > 0) {
      console.error('❌ Duplicate node IDs detected:')
      duplicateIds.forEach(([id, nodes]) => {
        console.error(`   - ${id}: appears ${nodes.length} times`)
        nodes.forEach(({ node, index }, idx) => {
          console.error(`     ${idx + 1}. Index: ${index}, Type: ${node.type}, Label: ${node.data?.label || 'N/A'}`)
        })
      })
    }
    
    // Unique node'lar oluştur - duplicate olanların sonrakilerini unique ID ile değiştir
    const uniqueNodes: Node[] = []
    const idCounter = new Map<string, number>()
    
    nodeList.forEach((node) => {
      const existing = seenIds.get(node.id)
      if (existing && existing.length > 1) {
        // Duplicate varsa, ilkini tut, diğerlerine unique ID ver
        const counter = idCounter.get(node.id) || 0
        if (counter === 0) {
          // İlk duplicate'i olduğu gibi tut
          uniqueNodes.push(node)
        } else {
          // Sonraki duplicate'lere unique ID ver
          const uniqueId = `${node.id}-duplicate-${counter}`
          console.warn(`⚠️ Renaming duplicate node ID "${node.id}" to "${uniqueId}"`)
          uniqueNodes.push({
            ...node,
            id: uniqueId
          })
        }
        idCounter.set(node.id, counter + 1)
      } else {
        // Duplicate yoksa olduğu gibi ekle
        uniqueNodes.push(node)
      }
    })

    if (duplicateIds.length > 0) {
      console.warn(`⚠️ Processed ${duplicateIds.length} duplicate ID(s), created ${uniqueNodes.length} unique node(s)`)
    }

    return uniqueNodes
  }, [data, handleUnitClick, handleContextMenu, expandedCoordinator, expandedCoordinatorData, customPositions, isLocked, turkeyMapExpanded, getCityPersonnel])

  // Convert data to React Flow edges
  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = []
    const edgeIdsSeen = new Set<string>() // Track edge IDs to prevent duplicates
    
    // Get custom connections for handle lookup and waypoints (PERSISTENT STATE)
    const customConnMap = new Map<string, { 
      sourceHandle: string; 
      targetHandle: string;
      waypoints?: Array<{ x: number; y: number }>;
      data?: any;
    }>()
    ;(firebaseConnections || []).forEach(conn => {
      const key = `${conn.source}-${conn.target}`
      customConnMap.set(key, {
        sourceHandle: conn.sourceHandle || 'bottom-source',
        targetHandle: conn.targetHandle || 'top',
        waypoints: conn.waypoints || [],
        data: conn.data || {}
      })
    })
    
    // Track executive IDs to prevent duplicate edges from coordinators array
    const executiveIds = new Set(data.executives.map(e => e.id))

    // Chairman to executives
    // FULL MANUAL CONTROL: User-defined handles and waypoints
    data.executives.forEach((exec) => {
      if (exec.parent) {
        // Check if there's a custom connection with specific handles
        const connKey = `${exec.parent}-${exec.id}`
        const customConn = customConnMap.get(connKey)
        edgeList.push({
          id: `${exec.parent}-${exec.id}`,
          source: exec.parent,
          target: exec.id,
          type: 'manual', // FULL MANUAL CONTROL: User-defined path
          sourceHandle: customConn?.sourceHandle || 'bottom-source',
          targetHandle: customConn?.targetHandle || 'top',
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          data: { 
            waypoints: customConn?.waypoints || [], // PERSISTENT: Load from Firebase
            ...customConn?.data 
          },
        })
      }
    })

    // Executives to main coordinators
    data.mainCoordinators.forEach((coord) => {
      if (coord.parent) {
        const edgeId = `${coord.parent}-${coord.id}`
        // Skip if edge already exists (prevent duplicates)
        if (edgeIdsSeen.has(edgeId)) {
          return
        }
        edgeIdsSeen.add(edgeId)
        
        const connKey = `${coord.parent}-${coord.id}`
        const customConn = customConnMap.get(connKey)
        edgeList.push({
          id: edgeId,
          source: coord.parent,
          target: coord.id,
          type: 'manual', // FULL MANUAL CONTROL
          sourceHandle: customConn?.sourceHandle || 'bottom-source',
          targetHandle: customConn?.targetHandle || 'top',
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          data: { waypoints: customConn?.waypoints || [] },
        })
      }
    })

    // Main coordinators to sub-coordinators
    // SKIP coordinators that are already executives (prevent duplicate edges)
    data.coordinators.forEach((coord) => {
      // Skip if this coordinator ID already exists as an executive
      if (executiveIds.has(coord.id)) {
        return // Already handled as executive edge
      }
      
      if (coord.parent) {
        const edgeId = `${coord.parent}-${coord.id}`
        // Skip if edge already exists (prevent duplicates)
        if (edgeIdsSeen.has(edgeId)) {
          return
        }
        edgeIdsSeen.add(edgeId)
        
        const connKey = `${coord.parent}-${coord.id}`
        const customConn = customConnMap.get(connKey)
        edgeList.push({
          id: edgeId,
          source: coord.parent,
          target: coord.id,
          type: 'manual', // FULL MANUAL CONTROL
          sourceHandle: customConn?.sourceHandle || 'bottom-source',
          targetHandle: customConn?.targetHandle || 'top',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          data: { 
            waypoints: customConn?.waypoints || [], // PERSISTENT: Load from Firebase
            ...customConn?.data 
          },
        })
      }
    })

    // EXPANDED PANEL EDGES: DRAW.IO STYLE ORTHOGONAL CONNECTORS
    // All expanded panels are treated as CHILD NODES with clean, orthogonal connections
    if (expandedCoordinatorData) {
      const coordId = expandedCoordinatorData.id
      const rootId = `detail-${coordId}-root`

      // Main coordinator node to root detail node
      // FULL MANUAL CONTROL: User-defined handles and waypoints
        const connKey = `${expandedCoordinator}-${rootId}`
        const mainToRootConn = customConnMap.get(connKey)
      edgeList.push({
        id: `detail-main-to-coord-${coordId}`,
        source: expandedCoordinator!,
        target: rootId,
        type: 'manual', // FULL MANUAL CONTROL
        sourceHandle: mainToRootConn?.sourceHandle || 'bottom-source',
        targetHandle: mainToRootConn?.targetHandle || 'top',
        style: { stroke: '#3b82a0', strokeWidth: 2 },
        data: { 
          waypoints: mainToRootConn?.waypoints || [], // PERSISTENT: Load from Firebase
          ...mainToRootConn?.data 
        },
      })

      // Root to deputies - VERTICAL STACK with ORTHOGONAL connectors
      const uniqueDeputiesForEdges = expandedCoordinatorData.deputies?.filter((deputy, idx, arr) => 
        arr.findIndex(d => d.id === deputy.id) === idx
      ) || []
      
      uniqueDeputiesForEdges.forEach((deputy) => {
        const deputyNodeId = `detail-${coordId}-deputy-${deputy.id}`
        edgeList.push({
          id: `detail-coord-to-deputy-${coordId}-${deputy.id}`,
          source: rootId,
          target: deputyNodeId,
          type: 'step', // DRAW.IO STYLE ORTHOGONAL: 90-degree angles only
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
        })
      })

      // Root to sub-units - VERTICAL STACK with ORTHOGONAL connectors
      expandedCoordinatorData.subUnits?.forEach((subUnit) => {
        const subUnitNodeId = `detail-${coordId}-subunit-${subUnit.id}`
        const connKey = `${rootId}-${subUnitNodeId}`
        const subUnitConn = customConnMap.get(connKey)
        edgeList.push({
          id: `detail-to-subunit-${coordId}-${subUnit.id}`,
          source: rootId,
          target: subUnitNodeId,
          type: 'manual', // FULL MANUAL CONTROL
          sourceHandle: subUnitConn?.sourceHandle || 'bottom-source',
          targetHandle: subUnitConn?.targetHandle || 'top',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
          data: { waypoints: [] },
        })
      })

      // Root to people - VERTICAL STACK with ORTHOGONAL connectors
      expandedCoordinatorData.people?.forEach((person) => {
        const personNodeId = `detail-${coordId}-person-${person.id || `person-${Date.now()}`}`
        const personConnKey = `${rootId}-${personNodeId}`
        const personConn = customConnMap.get(personConnKey)
        edgeList.push({
          id: `detail-to-person-${coordId}-${person.id || `person-${Date.now()}`}`,
          source: rootId,
          target: personNodeId,
          type: 'manual', // FULL MANUAL CONTROL
          sourceHandle: personConn?.sourceHandle || 'bottom-source',
          targetHandle: personConn?.targetHandle || 'top',
          style: { stroke: '#9ca3af', strokeWidth: 1.5 },
          data: { 
            waypoints: personConn?.waypoints || [], // PERSISTENT: Load from Firebase
            ...personConn?.data 
          },
        })
      })
    }

    // Toplumsal Çalışmalar için harita edge'i
    if (turkeyMapExpanded) {
      const mapConnKey = 'toplumsal-calismalar-turkey-map-node'
      const mapConn = customConnMap.get(mapConnKey)
      edgeList.push({
        id: 'toplumsal-calismalar-to-map',
        source: 'toplumsal-calismalar',
        target: 'turkey-map-node',
        type: 'manual', // FULL MANUAL CONTROL
        sourceHandle: mapConn?.sourceHandle || 'bottom-source',
        targetHandle: mapConn?.targetHandle || 'top',
        style: { stroke: '#10b981', strokeWidth: 3 },
        data: { 
          waypoints: mapConn?.waypoints || [], // PERSISTENT: Load from Firebase
          ...mapConn?.data 
        },
      })
    }

    // T3/Teknofest Ortak Koordinatörlükler için Elvan ve Muhammet'e bağlantı
    const t3TeknofestCoord = data.mainCoordinators.find(c => c.id === 't3-teknofest-koordinatorlukleri')
    if (t3TeknofestCoord) {
      // Elvan'a bağlantı
      const elvanEdgeId = 'elvan-kuzucu-to-t3-teknofest'
      if (!edgeIdsSeen.has(elvanEdgeId)) {
        edgeIdsSeen.add(elvanEdgeId)
        const elvanConnKey = 'elvan-kuzucu-t3-teknofest-koordinatorlukleri'
        const elvanConn = customConnMap.get(elvanConnKey)
        edgeList.push({
          id: elvanEdgeId,
          source: 'elvan-kuzucu',
          target: 't3-teknofest-koordinatorlukleri',
          type: 'manual', // FULL MANUAL CONTROL
          sourceHandle: elvanConn?.sourceHandle || 'bottom-source',
          targetHandle: elvanConn?.targetHandle || 'top',
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          data: { 
            waypoints: elvanConn?.waypoints || [], // PERSISTENT: Load from Firebase
            ...elvanConn?.data 
          },
        })
      }
      // Muhammet'e bağlantı
      const muhammetEdgeId = 'muhammet-saymaz-to-t3-teknofest'
      if (!edgeIdsSeen.has(muhammetEdgeId)) {
        edgeIdsSeen.add(muhammetEdgeId)
        const muhammetConnKey = 'muhammet-saymaz-t3-teknofest-koordinatorlukleri'
        const muhammetConn = customConnMap.get(muhammetConnKey)
        edgeList.push({
          id: muhammetEdgeId,
          source: 'muhammet-saymaz',
          target: 't3-teknofest-koordinatorlukleri',
          type: 'manual', // FULL MANUAL CONTROL
          sourceHandle: muhammetConn?.sourceHandle || 'bottom-source',
          targetHandle: muhammetConn?.targetHandle || 'top',
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          data: { 
            waypoints: muhammetConn?.waypoints || [], // PERSISTENT: Load from Firebase
            ...muhammetConn?.data 
          },
        })
      }
    }

    // FIREBASE CONNECTIONS'LARI DİREKT EDGE OLARAK EKLE - ZORLA EKLE
    // Firebase'deki TÜM connections'ları direkt edge olarak ekle (parent-child kontrolü YOK)
    console.log('🔗 Firebase connections sayısı:', firebaseConnections?.length || 0)
    
    if (firebaseConnections && firebaseConnections.length > 0) {
      let addedCount = 0
      firebaseConnections.forEach((conn: any) => {
        if (!conn || !conn.source || !conn.target) {
          return // Geçersiz connection
        }
        
        const edgeId = `${conn.source}-${conn.target}`
        
        // Eğer bu edge zaten oluşturulmuşsa, atla
        if (edgeIdsSeen.has(edgeId)) {
          return
        }
        
        // DİREKT EKLE - node kontrolü yapma, Firebase'de varsa ekle
        edgeIdsSeen.add(edgeId)
        edgeList.push({
          id: edgeId,
          source: conn.source,
          target: conn.target,
          type: 'manual',
          sourceHandle: conn.sourceHandle || 'bottom-source',
          targetHandle: conn.targetHandle || 'top',
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          data: { 
            waypoints: conn.waypoints || [],
            ...conn.data 
          },
        })
        addedCount++
      })
      console.log(`✅ Firebase'den ${addedCount} edge eklendi`)
    }

    // EDGE DEBUG LOG
    console.log('🔗 Toplam edge oluşturuldu:', edgeList.length)
    if (edgeList.length > 0) {
      console.log('  İlk 5 edge:', edgeList.slice(0, 5).map(e => `${e.source}→${e.target}`))
    }

    // STRICT HIERARCHY: Validate edges and remove duplicates
    // Also ensure no unit has multiple incoming connections (violates hierarchy)
    const seenEdgeIds = new Set<string>()
    const targetToSource = new Map<string, string>() // Track which source connects to each target
    
    const uniqueEdges = edgeList.filter(edge => {
      // Check for duplicate edge IDs
      if (seenEdgeIds.has(edge.id)) {
        return false // Silent skip
      }
      seenEdgeIds.add(edge.id)
      
      // STRICT HIERARCHY RULE: Each target must have exactly ONE source
      // EXCEPTION: T3/Teknofest Ortak Koordinatörlükler iki parent'a sahip olabilir (Elvan ve Muhammet)
      if (targetToSource.has(edge.target) && edge.target !== 't3-teknofest-koordinatorlukleri') {
        return false // Silent skip
      }
      // T3/Teknofest için multiple parent'a izin ver
      if (edge.target !== 't3-teknofest-koordinatorlukleri') {
        targetToSource.set(edge.target, edge.source)
      }
      
      return true
    })

    console.log('✅ Benzersiz edge sayısı:', uniqueEdges.length)
    return uniqueEdges
  }, [data, expandedCoordinator, expandedCoordinatorData, firebaseConnections, turkeyMapExpanded])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setFlowEdges, onEdgesChangeBase] = useEdgesState(edges)

  // Edge değişikliklerini Firebase'e kaydet (PERSISTENT STATE)
  // STRUCTURAL LOCK: Prevent edge deletion, only allow geometry editing
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Filter out deletion attempts - STRUCTURAL LOCK
    const filteredChanges = changes.filter((change) => {
      if (change.type === 'remove') {
        // BLOCK EDGE DELETION: Hierarchy is locked
        const edge = flowEdges.find(e => e.id === change.id)
        if (edge) {
          console.warn('🚫 STRUCTURAL LOCK: Edge deletion blocked. Hierarchy cannot be broken.', {
            edgeId: change.id,
            source: edge.source,
            target: edge.target
          })
          showToast('Bağlantı silinemez. Hiyerarşi yapısı kilitli.', 'warning')
        }
        return false // Block this change
      }
      return true // Allow other changes (select, geometry updates)
    })

    // Apply only non-deletion changes
    onEdgesChangeBase(filteredChanges)

    // Edge değişikliklerini işle (waypoints, handles, vb.)
    filteredChanges.forEach((change) => {
      if (change.type === 'select' && change.selected) {
        // Edge seçildi - editing mode'a geç
        return
      }

      // Edge data güncellemeleri için flowEdges state'ini takip ediyoruz
      // (useEffect ile ayrı bir handler'da işlenecek)
    })
  }, [onEdgesChangeBase, flowEdges, showToast])

  const onEdgesChange = handleEdgesChange

  // nodes veya edges değiştiğinde flowNodes ve flowEdges'i güncelle
  useEffect(() => {
    setFlowNodes(nodes)
  }, [nodes, setFlowNodes])

  useEffect(() => {
    setFlowEdges(edges)
  }, [edges, setFlowEdges])

  // Edge data değişikliklerini Firebase'e kaydet (PERSISTENT STATE)
  // flowEdges değiştiğinde edge data'sını kontrol et ve güncelle
  const prevEdgesRef = useRef<Edge[]>([])
  useEffect(() => {
    // Edge data değişikliklerini tespit et ve Firebase'e kaydet
    flowEdges.forEach((edge) => {
      const prevEdge = prevEdgesRef.current.find(e => e.id === edge.id)
      
      if (prevEdge) {
        // Edge mevcut - data değişikliklerini kontrol et
        const dataChanged = 
          JSON.stringify(prevEdge.data?.waypoints) !== JSON.stringify(edge.data?.waypoints) ||
          prevEdge.sourceHandle !== edge.sourceHandle ||
          prevEdge.targetHandle !== edge.targetHandle ||
          JSON.stringify(prevEdge.data) !== JSON.stringify(edge.data)

        if (dataChanged && edge.source && edge.target) {
          const updates: any = {}
          
          if (edge.data?.waypoints) {
            updates.waypoints = edge.data.waypoints
          }
          
          if (edge.sourceHandle) {
            updates.sourceHandle = edge.sourceHandle
          }
          
          if (edge.targetHandle) {
            updates.targetHandle = edge.targetHandle
          }

          if (edge.data) {
            updates.data = edge.data
          }

          if (Object.keys(updates).length > 0) {
            updateFirebaseConnection(edge.source, edge.target, updates)
          }
        }
      }
    })
    
    prevEdgesRef.current = flowEdges
  }, [flowEdges, updateFirebaseConnection])

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
      rankdir: direction, // TOP to BOTTOM - strict hierarchy
      // Node'lar arası mesafe - üst üste gelmesin, aşağıya açılsın
      nodesep: 150, // Horizontal spacing between nodes at same level (artırıldı - üst üste gelmesin)
      ranksep: 200, // Vertical spacing between levels (ranks) (artırıldı - aşağıya açılsın)
      ranker: 'tight-tree', // Better for strict hierarchy (tree structure)
      marginx: 100,
      marginy: 150, // Alt boşluk artırıldı
      acyclicer: 'greedy', // Ensure no cycles
      align: 'UL' // Align nodes to upper-left for consistency
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
            reactFlowInstance.fitView({ padding: 0.15, duration: 500, maxZoom: 0.9 })
          }
        } else {
          // Tüm şemayı görünür yap - ilk yüklemede önemli
          reactFlowInstance.fitView({ padding: 0.15, duration: 500, maxZoom: 0.9 })
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

  // Otomatik layout uygula (SADECE kullanıcı manuel olarak butona bastığında)
  // MANUEL KONTROL MODU: shouldAutoLayout artık otomatik tetiklenmiyor
  useEffect(() => {
    if (shouldAutoLayout) {
      // Kullanıcı manuel olarak "Oto Yerleştir" butonuna bastığında çalışır
      // Uyarı göster (skipWarning: false) - kullanıcı bilinçli olarak layout istiyor
      const timer = setTimeout(() => {
        applyAutoLayout('TB', false, undefined) // Uyarı göster
        setShouldAutoLayout(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoLayout, applyAutoLayout])

  // INLINE VERTICAL EXPANSION: Expanded content appears directly below parent
  // NO auto-layout, NO repositioning - expansion is calculated inline in the nodes useMemo
  // This effect only ensures the view is adjusted (optional, doesn't change positions)
  useEffect(() => {
    if (expandedCoordinatorData && flowNodes.length > 0) {
      // Açılır node'ları bul (detail- ile başlayan)
      const detailNodes = flowNodes.filter(node => node.id.startsWith(`detail-${expandedCoordinatorData.id}-`))
      if (detailNodes.length > 0) {
        // INLINE EXPANSION: Node'lar zaten doğru pozisyonda (nodes useMemo'da hesaplandı)
        // Sadece görünümü ayarla (pozisyonları değiştirmeden)
        console.log('✅ INLINE VERTICAL EXPANSION: Expanded content positioned directly below parent')
        
        // Optional: Adjust view to see expanded content (does NOT change positions)
        setTimeout(() => {
          try {
            // fitView is optional - expansion positions are already correct
            // reactFlowInstance.fitView({ padding: 0.25, duration: 800, maxZoom: 0.8 })
            console.log('✅ Expanded content displayed inline below parent')
          } catch (error) {
            console.warn('fitView başarısız:', error)
          }
        }, 300)
      }
    }
  }, [expandedCoordinatorData, flowNodes.length, reactFlowInstance])

  // FIXED INITIAL STATE: Preserve diagram EXACTLY as saved - pixel-perfect restoration
  // CRITICAL: NO auto-layout, NO repositioning, NO re-centering, NO optimization
  useEffect(() => {
    if (!isLoading && flowNodes.length > 0 && !hasAutoLayoutRunRef.current) {
      // STRICT: Preserve existing diagram exactly as-is - positions are LOCKED
      console.log('✅ FIXED INITIAL STATE: Diagram loaded pixel-perfectly from saved positions')
      console.log(`   - Loaded ${flowNodes.length} nodes with saved positions`)
      console.log(`   - NO auto-layout, NO repositioning, NO reflow`)
      hasAutoLayoutRunRef.current = true
      
      // CRITICAL: fitView is DISABLED to preserve exact viewport state
      // fitView would change the viewport, which could affect perceived positions
      // If user wants to see the diagram, they can manually zoom/pan
      // Positions are already correct from getPosition() function
      // setTimeout(() => {
      //   try {
      //     reactFlowInstance.fitView({ padding: 0.15, duration: 800, maxZoom: 0.9 })
      //   } catch (error) {
      //     console.warn('fitView başarısız:', error)
      //   }
      // }, 500)
    }
  }, [isLoading, flowNodes.length, reactFlowInstance])


  // Pozisyon kaydetme için debounce timer
  const positionSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPositionsRef = useRef<Record<string, { x: number; y: number }>>({})

  // Node sürüklendiğinde pozisyonu Firebase'e kaydet (debounced)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)

    // Sürükleme bittiğinde pozisyonu kaydet (debounced)
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        const nodeId = change.id
        const newPosition = { x: change.position!.x, y: change.position!.y }
        
        // Lokal state'i hemen güncelle (UI responsive olsun)
        setLocalPositions(prev => ({ ...prev, [nodeId]: newPosition }))
        
        // Pending positions'a ekle
        pendingPositionsRef.current[nodeId] = newPosition
        
        // Debounce: 500ms sonra Firebase'e kaydet (çok fazla yazma işlemi yapmamak için)
        if (positionSaveTimerRef.current) {
          clearTimeout(positionSaveTimerRef.current)
        }
        
        positionSaveTimerRef.current = setTimeout(() => {
          // Tüm pending pozisyonları birleştir
          const positionsToSave = {
            ...customPositions,
            ...pendingPositionsRef.current
          }
          
          console.log('💾 Pozisyonlar Firebase\'e kaydediliyor:', Object.keys(positionsToSave).length, 'node')
          console.log('  - Güncellenen node\'lar:', Object.keys(pendingPositionsRef.current).join(', '))
          
          // Executive node pozisyonlarını da kaydet
          Object.keys(pendingPositionsRef.current).forEach(nodeId => {
            const executive = data.executives.find(e => e.id === nodeId)
            if (executive) {
              const newPosition = pendingPositionsRef.current[nodeId]
              console.log(`  - Executive pozisyonu güncelleniyor: ${nodeId} -> (${newPosition.x}, ${newPosition.y})`)
              updateExecutive(nodeId, { position: newPosition })
            }
          })
          
          // Firebase'e kaydet - bu fonksiyon state'i de güncelleyecek
          updateFirebasePositions(positionsToSave)
          
          // Lokal state'i de güncelle (hemen görünsün)
          setLocalPositions(prev => ({ ...prev, ...pendingPositionsRef.current }))
          
          // Pending positions'ı temizle
          const savedNodeIds = Object.keys(pendingPositionsRef.current)
          pendingPositionsRef.current = {}
          
          console.log('✅ Pozisyonlar Firebase\'e kaydedildi:', savedNodeIds.length, 'node')
          console.log('  - Kaydedilen node\'lar:', savedNodeIds.join(', '))
        }, 500)
      }
    })
  }, [onNodesChange, customPositions, updateFirebasePositions, data.executives, updateExecutive])

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

  // MANUEL BAĞLANTI OLUŞTURMA: Aktif
  const startConnection = useCallback((nodeId: string, nodeName: string, sourceHandle: 'top' | 'bottom') => {
    setConnectionMode({
      active: true,
      sourceId: nodeId,
      sourceName: nodeName,
      sourceHandle: sourceHandle
    })
    setContextMenu(null)
    setConnectionHandleModal(null)
    showToast('Bağlantı modu aktif. Hedef node\'a tıklayın.', 'info')
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
      const coordinator = data.coordinators.find(c => c.id === contextMenu.nodeId)
      setFormModal({
        isOpen: true,
        type: 'subunit',
        title: 'Alt Birim Ekle',
        nodeId: contextMenu.nodeId,
        deputies: coordinator?.deputies || [],
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

  // Personel Ata - mevcut personeli bir birime atamak için
  const handleAssignPerson = () => {
    if (contextMenu) {
      const coordinator = data.coordinators.find(c => c.id === contextMenu.nodeId)
      if (coordinator) {
        // Önce birim seçim modalını aç
        setSubUnitSelectionModal({
          coordinatorId: contextMenu.nodeId,
          coordinatorTitle: coordinator.title,
        })
      }
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
        // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
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
        // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
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
        // MANUEL KONTROL: Otomatik layout devre dışı
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

    // Otomatik layout devre dışı - kullanıcı manuel pozisyonları korumak istiyor
    const shouldAutoLayoutAfter = false

    try {
      if (!currentModal.nodeId) {
        console.error('❌ handleFormSave: nodeId bulunamadı', currentModal)
        showToast('Koordinatör ID bulunamadı', 'error')
        formSaveInProgressRef.current = false
        return
      }
      
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
          // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
          break
        case 'subunit':
          try {
            // Eğer initialData.id veya formData.id varsa, bu bir güncelleme işlemi
            const subUnitIdToUpdate = currentModal.initialData?.id || formData.id
            if (!formData.title || !formData.title.trim()) {
              showToast('Birim adı boş olamaz', 'error')
              return
            }
            
            if (subUnitIdToUpdate) {
              // Mevcut birimi güncelle
              const responsibilitiesArray = Array.isArray(formData.responsibilities)
                ? formData.responsibilities.filter((r: string) => r && String(r).trim())
                : []
              
              if (!currentModal.nodeId) {
                showToast('Koordinatör ID bulunamadı', 'error')
                return
              }
              
              updateSubUnit(currentModal.nodeId, subUnitIdToUpdate, {
                title: formData.title.trim(),
                description: (formData.description || '').trim(),
                responsibilities: responsibilitiesArray,
                deputyId: formData.deputyId || undefined,
              })
              showToast('Birim güncellendi', 'success')
              // Koordinatörü tekrar expand et (güncellenmiş verilerin görünmesi için)
              setTimeout(() => {
                setExpandedCoordinator(currentModal.nodeId)
                // MANUEL KONTROL: Otomatik layout devre dışı
              }, 200)
            } else {
              // Yeni birim ekle - addSubUnit fonksiyonu zaten duplicate kontrolü yapıyor
              const responsibilitiesArrayNew = Array.isArray(formData.responsibilities)
                ? formData.responsibilities.filter((r: string) => r && String(r).trim())
                : []
              
              if (!currentModal.nodeId) {
                showToast('Koordinatör ID bulunamadı', 'error')
                return
              }
              
              addSubUnit(currentModal.nodeId, {
                title: formData.title.trim(),
                people: [],
                responsibilities: responsibilitiesArrayNew,
                description: (formData.description || '').trim(),
                deputyId: formData.deputyId || undefined,
              })
              showToast('Birim eklendi', 'success')
              // Koordinatörü expand et (yeni birimin görünmesi için)
              setTimeout(() => {
                setExpandedCoordinator(currentModal.nodeId)
                // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
              }, 100)
            }
          } catch (error) {
            console.error('❌ SubUnit işlemi hatası:', error)
            showToast('Bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'), 'error')
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
          
          // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
          break
        case 'responsibility':
          formData.responsibilities?.forEach((resp: string) => {
            if (resp.trim()) {
              addResponsibility(currentModal.nodeId, resp)
            }
          })
          break
        case 'person':
          try {
            if (!formData.subUnitId || !formData.name || !formData.name.trim()) {
              showToast('İsim ve birim seçimi zorunludur', 'error')
              return
            }
            
            if (!currentModal.nodeId) {
              showToast('Koordinatör ID bulunamadı', 'error')
              return
            }
            
            // addPerson fonksiyonu zaten duplicate kontrolü yapıyor
            addPerson(currentModal.nodeId, formData.subUnitId, {
              name: formData.name.trim(),
              title: (formData.title || '').trim() || undefined,
              email: formData.email?.trim() || undefined,
              phone: formData.phone?.trim() || undefined,
              university: formData.university?.trim() || undefined,
              department: formData.department?.trim() || undefined,
              jobDescription: formData.jobDescription?.trim() || undefined,
              cvFileName: formData.cvFileName || undefined,
              cvData: formData.cvData || undefined,
              notes: formData.notes?.trim() || undefined,
            })
            showToast(`${formData.name.trim()} birime eklendi`, 'success')
            // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
            // Koordinatörü expand et (yeni personelin görünmesi için)
            setTimeout(() => {
              setExpandedCoordinator(currentModal.nodeId)
            }, 200)
          } catch (error) {
            console.error('❌ Person ekleme hatası:', error)
            showToast('Bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'), 'error')
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
        case 'city-person':
          // city-person formu artık kullanılmıyor (harita node'u içinde yeni sistem var)
          // Ama hata vermemesi için role default olarak 'ilSorumlusu' veriyoruz
          if (formData.city && formData.name) {
            addCityPerson(formData.city, formData.role || 'ilSorumlusu', {
              name: formData.name,
              title: formData.title || '',
              email: formData.email || undefined,
              phone: formData.phone || undefined,
              university: formData.university || undefined,
              department: formData.department || undefined,
              jobDescription: formData.jobDescription || undefined,
              cvFileName: formData.cvFileName || undefined,
              cvData: formData.cvData || undefined,
              notes: formData.notes || undefined,
              photoData: formData.photoData || undefined,
            })
            showToast(`${formData.city} iline personel eklendi`, 'success')
          }
          break
      }

      // Modal'ı hemen kapat (çift çağrıyı önlemek için)
      setFormModal(null)
    } catch (error) {
      // Hata yakala ve kullanıcıya göster
      console.error('❌ Form kaydetme hatası:', error)
      console.error('Hata detayları:', {
        type: currentModal.type,
        nodeId: currentModal.nodeId,
        formData: formData,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error')
      // Modal'ı kapatma, kullanıcı tekrar deneyebilsin
    } finally {
      // Guard'ı gecikmeyle sıfırla
      setTimeout(() => {
        formSaveInProgressRef.current = false
      }, 1000)
    }
  }, [formModal, expandedCoordinator, addDeputy, addSubUnit, addPerson, addResponsibility, updateCoordinator, updatePerson, updateSubUnit, addCityPerson, setShouldAutoLayout, setExpandedCoordinator, showToast])

  return (
    <div className="w-full h-screen flex" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)' }}>
      {/* Sol Panel - Türkiye Haritası */}
      {turkeyMapOpen && (
        <TurkeyMapPanel
          isOpen={turkeyMapOpen}
          onClose={() => setTurkeyMapOpen(false)}
          cityPersonnel={getCityPersonnel()}
          onAddPerson={(city: string, person: Omit<Person, 'id'>) => {
            // TurkeyMapPanel eski sistemde, default olarak 'ilSorumlusu' rolü veriyoruz
            addCityPerson(city, 'ilSorumlusu', person)
          }}
          onUpdatePerson={(city: string, personId: string, updates: Partial<Person>) => {
            // TurkeyMapPanel eski sistemde, default olarak 'ilSorumlusu' rolü kullanıyoruz
            updateCityPerson(city, 'ilSorumlusu', personId, updates)
          }}
          onDeletePerson={(city: string, personId: string) => {
            // TurkeyMapPanel eski sistemde, default olarak 'ilSorumlusu' rolü kullanıyoruz
            deleteCityPerson(city, 'ilSorumlusu', personId)
          }}
        />
      )}

      {/* Sağ Taraf - Şema */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(connection) => {
            // React Flow'un Handle'lardan sürükleyerek bağlantı oluşturma
            // FULL MANUAL CONTROL: Support all 4 directions (top, bottom, left, right)
            if (connection.source && connection.target && connection.source !== connection.target) {
              // Extract handle direction from handle ID (e.g., "top", "right-source", etc.)
              const getHandleDirection = (handleId: string | null | undefined): 'top' | 'bottom' | 'left' | 'right' => {
                if (!handleId) return 'bottom'
                if (handleId.includes('top')) return 'top'
                if (handleId.includes('right')) return 'right'
                if (handleId.includes('bottom')) return 'bottom'
                if (handleId.includes('left')) return 'left'
                return 'bottom'
              }
              
              const sourceHandle = getHandleDirection(connection.sourceHandle)
              const targetHandle = getHandleDirection(connection.targetHandle)
              
              console.log('🔗 React Flow onConnect (FULL MANUAL CONTROL):', {
                source: connection.source,
                target: connection.target,
                sourceHandle,
                targetHandle
              })
              
              addFirebaseConnection({
                source: connection.source,
                target: connection.target,
                sourceHandle,
                targetHandle
              })
              
              showToast('Bağlantı oluşturuldu! (Manuel kontrol aktif)', 'success')
            }
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Strict}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          onSelectionChange={handleSelectionChange}
          onNodeClick={(_, node) => {
            // Toplumsal Çalışmalar Koordinatörlüğü'ne tıklandığında haritayı node altında göster
            if (node.id === 'toplumsal-calismalar') {
              setTurkeyMapExpanded(prev => !prev)
              return
            }
            // MANUEL BAĞLANTI MODU: Aktif
            if (connectionMode.active && connectionMode.sourceId) {
              // Hedef node seçildi - bağlantıyı tamamla
              if (connectionMode.sourceId !== node.id) {
                // Target handle seçimi için modal aç
                setPendingTarget({ targetId: node.id })
                setConnectionHandleModal({
                  isOpen: true,
                  nodeId: node.id,
                  nodeName: (node.data?.label || node.id) as string
                })
              } else {
                // Aynı node'a tıklandı - iptal et
                setConnectionMode({ active: false, sourceId: null, sourceName: null, sourceHandle: 'bottom' })
                showToast('Bağlantı modu iptal edildi.', 'info')
              }
            }
          }}
          nodesDraggable={!isLocked}
          minZoom={0.2}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          defaultEdgeOptions={{ 
            type: 'manual', // Use manual edge type for full user control
            style: { strokeWidth: 2 },
            // FULL MANUAL CONTROL: No auto-routing, no auto-bending
            animated: false,
            // Preserve edge geometry when nodes move
            updatable: true,
            // User-defined waypoints (bend points) stored in edge data
            data: { waypoints: [] }
          }} // FULL MANUAL EDGE CONTROL - Orthogonal segments, user-defined bend points
          className="react-flow-custom"
          // Çoklu seçim özellikleri (masaüstü gibi)
          selectionOnDrag={true}
          panOnDrag={[1, 2]}
          selectNodesOnDrag={true}
          selectionKeyCode={null}
          // Klavuz çizgileri (Snap to Grid) - Node'ları grid'e hizalar
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]} // 20px grid boyutu (x, y)
          // STRUCTURAL LOCK: Edges are editable for geometry only (waypoints, handles)
          // Hierarchy structure is locked - no deletion, no new connections
          edgesUpdatable={!isLocked} // Allow geometry editing (waypoints, handles)
          edgesFocusable={true}
          // STRUCTURAL LOCK: Disable new connections via handles
          // Users can only edit geometry of existing edges
          nodesConnectable={false} // Block new edge creation - hierarchy is locked
          deleteKeyCode={null} // Disable Delete key for edges
          multiSelectionKeyCode={null} // Disable multi-select deletion
          // Note: selectEdgesOnDrag is not a valid React Flow prop
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
            {/* STRUCTURAL LOCK Indicator - Hierarchy is locked */}
            <div className="backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border bg-blue-50 border-blue-300 flex items-center gap-2" title="Hiyerarşi Yapısı Kilitli: Sadece bağlantı geometrisi (anchor noktaları, büküm noktaları) düzenlenebilir. Yeni bağlantı oluşturulamaz veya mevcut bağlantılar silinemez.">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-medium text-blue-700">Hiyerarşi Kilitli</span>
            </div>
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

            {/* Personel butonu */}
            <button
              onClick={() => {
                setPersonnelPanelOpen(true)
                setRightPanelCoordinatorId(null) // Sağ paneli kapat
              }}
              className="backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
              title="Tüm Personel"
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {/* Klavuz Çizgileri (Snap to Grid) Toggle */}
            <button
              onClick={() => {
                setSnapToGrid(prev => !prev)
                showToast(snapToGrid ? 'Klavuz çizgileri kapatıldı' : 'Klavuz çizgileri açıldı', 'info')
              }}
              className={`backdrop-blur-sm rounded-lg p-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform ${
                snapToGrid
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              title={snapToGrid ? 'Klavuz Çizgilerini Kapat' : 'Klavuz Çizgilerini Aç'}
            >
              {snapToGrid ? (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                </svg>
              )}
            </button>

            {/* Firebase'e Kaydet butonu - TÜM POZİSYONLARI KAYDET */}
            {!isLocked && (
              <button
                onClick={() => {
                  // Tüm mevcut node pozisyonlarını topla (tüm node'lar dahil)
                  const allCurrentPositions: Record<string, { x: number; y: number }> = {}
                  
                  // Tüm flow node'larının pozisyonlarını al
                  flowNodes.forEach(node => {
                    allCurrentPositions[node.id] = { 
                      x: node.position.x, 
                      y: node.position.y 
                    }
                  })
                  
                  // Mevcut Firebase pozisyonları ile birleştir (yeni pozisyonlar öncelikli)
                  const finalPositions = { 
                    ...customPositions, 
                    ...allCurrentPositions 
                  }
                  
                  // Firebase'e pozisyonları kaydet
                  updateFirebasePositions(finalPositions)
                  
                  // Lokal state'i de güncelle (hemen görünsün)
                  setLocalPositions(finalPositions)
                  
                  // TÜM BAĞLANTILARI FIREBASE'E KAYDET
                  const allConnections = flowEdges.map(edge => ({
                    source: edge.source,
                    target: edge.target,
                    sourceHandle: edge.sourceHandle || 'bottom-source',
                    targetHandle: edge.targetHandle || 'top',
                    waypoints: edge.data?.waypoints || [],
                    data: edge.data || {}
                  }))
                  
                  // Firebase'e tüm bağlantıları kaydet (mevcut bağlantıları override et)
                  allConnections.forEach(conn => {
                    // Eski bağlantıyı kaldır (varsa)
                    removeFirebaseConnection(conn.source, conn.target)
                    // Yeni bağlantıyı ekle
                    addFirebaseConnection(conn)
                  })
                  
                  // TÜM VERİLERİ FIREBASE'E KAYDET (Kişiler, Birimler, Her Şey)
                  // Bu fonksiyon tüm OrgData'yı (coordinators, executives, personnel, subUnits, vb.) kaydeder
                  saveData()
                  
                  // Başarı mesajı
                  const nodeCount = Object.keys(allCurrentPositions).length
                  const connectionCount = allConnections.length
                  showToast(`✅ TÜM VERİLER KAYDEDİLDİ: ${nodeCount} pozisyon, ${connectionCount} bağlantı, kişiler, birimler ve tüm veriler Firebase'e kaydedildi!`, 'success')
                  
                  console.log('💾 Firebase\'e kaydedilen TÜM VERİLER:', {
                    pozisyonlar: nodeCount,
                    baglantilar: connectionCount,
                    orgData: 'Tüm veriler (kişiler, birimler, koordinatörler, vb.)',
                    nodeIds: Object.keys(allCurrentPositions),
                    connectionIds: allConnections.map(c => `${c.source}→${c.target}`)
                  })
                }}
                className="backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border cursor-pointer hover:scale-105 transition-transform bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400 hover:from-blue-600 hover:to-indigo-700"
                title="TÜM VERİLERİ Firebase'e Kaydet: Pozisyonlar, Bağlantılar, Kişiler, Birimler ve Her Şey"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="text-white font-semibold text-sm">Firebase'e Kaydet</span>
                </div>
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
          onAddSubUnitResponsibility={addSubUnitResponsibility}
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
          onAssignPerson={handleAssignPerson}
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
            deputies={formModal.deputies || []}
          />
        )}

        {/* Person Detail Modal */}
        {personDetailModal && (
          <PersonDetailModal
            isOpen={personDetailModal.isOpen}
            person={personDetailModal.person}
            onClose={() => setPersonDetailModal(null)}
            onSave={(updates) => {
              updatePerson(personDetailModal.coordinatorId, personDetailModal.subUnitId, personDetailModal.person.id, updates)
              showToast('Personel bilgileri güncellendi', 'success')
              setPersonDetailModal(null)
              // Koordinatörü tekrar expand et (güncellenmiş verilerin görünmesi için)
              setTimeout(() => {
                setExpandedCoordinator(personDetailModal.coordinatorId)
              }, 200)
            }}
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
                {viewPersonCard.person.photoData ? (
                  <img
                    src={viewPersonCard.person.photoData}
                    alt={viewPersonCard.person.name}
                    className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-gray-200"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                    style={{ backgroundColor: viewPersonCard.person.color || '#6366f1' }}
                  >
                    {viewPersonCard.person.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-gray-800">{viewPersonCard.person.name}</h3>
                  <p className="text-xs text-gray-500 mt-2">{viewPersonCard.person.title || 'Personel'}</p>
                </div>
              </div>

              {/* Department Info - Tüm birimler */}
              {(() => {
                // Personelin tüm birimlerini bul (aynı isim ve ünvan ile)
                const allPersonUnits = viewPersonCard.type === 'subunit-person' || viewPersonCard.type === 'person'
                  ? getAllPersonnel().filter(item => 
                      item.person.name === viewPersonCard.person.name &&
                      item.person.title === viewPersonCard.person.title &&
                      item.type === 'subunit-person'
                    )
                  : []

                // Birimleri koordinatörlüğe göre grupla
                const unitsByCoordinator = allPersonUnits.reduce((acc, item) => {
                  if (!item.coordinatorTitle || !item.subUnitTitle) return acc
                  const key = item.coordinatorTitle
                  if (!acc[key]) {
                    acc[key] = []
                  }
                  acc[key].push(item.subUnitTitle)
                  return acc
                }, {} as Record<string, string[]>)

                return (
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3">
                    {/* Deputy için ünvan göster */}
                    {viewPersonCard.type === 'deputy' ? (
                      viewPersonCard.person.title ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="truncate max-w-[130px] font-medium">{viewPersonCard.coordinatorTitle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href="#" className="text-blue-600 hover:underline text-xs">Web Siteleri</a>
                          </div>
                        </div>
                      ) : null
                    ) : (
                      <>
                        {/* Koordinatörlük ve birimler listesi */}
                        {Object.keys(unitsByCoordinator).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(unitsByCoordinator).map(([coordTitle, unitTitles]) => (
                              <div key={coordTitle}>
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="font-medium">{coordTitle}</span>
                                  </div>
                                  <a href="#" className="text-blue-600 hover:underline text-xs">Web Siteleri</a>
                                </div>
                                {unitTitles.length > 0 && (
                                  <div className="ml-5 mt-1 space-y-1">
                                    {unitTitles.map((unitTitle, idx) => (
                                      <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                                        <span>•</span>
                                        <span>{unitTitle}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : viewPersonCard.coordinatorTitle ? (
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="truncate max-w-[130px] font-medium">{viewPersonCard.coordinatorTitle}</span>
                            </div>
                            <a href="#" className="text-blue-600 hover:underline text-xs">Web Siteleri</a>
                          </div>
                        ) : null}
                        {/* Eski format - sadece bir birim varsa */}
                        {Object.keys(unitsByCoordinator).length === 0 && viewPersonCard.subUnitTitle && (
                          <div className="text-xs text-gray-500 ml-5">{viewPersonCard.subUnitTitle}</div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

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

              {/* İşe Giriş ve Çalışma Süresi */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  İŞE GİRİŞ VE ÇALIŞMA SÜRESİ
                </h4>
                {(viewPersonCard.person.hireDate || viewPersonCard.person.seniority) ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-700">
                      {viewPersonCard.person.hireDate || ''} {viewPersonCard.person.seniority ? `- ${viewPersonCard.person.seniority}` : ''}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 text-center">Bilgi belirtilmemiş</p>
                  </div>
                )}
              </div>

              {/* Görev Tanımı Linkleri */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  GÖREV TANIMI LİNKLERİ
                </h4>
                {viewPersonCard.person.jobDescriptionLink ? (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2.5">
                    <a
                      href={viewPersonCard.person.jobDescriptionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="truncate">Görev Tanımı Linki</span>
                      <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">
                    <svg className="w-6 h-6 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="text-xs text-gray-400">Görev tanımı linki eklenmemiş</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}        {/* Person Context Menu (Sağ Tık Menüsü) */}
        {personContextMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[299]"
              onClick={() => setPersonContextMenu(null)}
            />
            {/* Menu */}
            <div
              className="fixed z-[300] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
              style={{ left: personContextMenu.x, top: personContextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400">
                {personContextMenu.type === 'deputy' ? 'Koordinatör Yardımcısı' : 'Personel'}
              </p>
              <p className="text-sm font-semibold text-gray-800 truncate">{personContextMenu.person.name}</p>
            </div>
            {personContextMenu.type !== 'deputy' && personContextMenu.type !== 'coordinator' && (
              <button
                onClick={() => {
                  setPersonDetailModal({
                    isOpen: true,
                    person: personContextMenu.person,
                    coordinatorId: personContextMenu.coordinatorId,
                    subUnitId: personContextMenu.subUnitId,
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
                            // MANUEL KONTROL: Otomatik layout devre dışı
                            showToast('Koordinatör yardımcısı başarıyla silindi', 'success')
                          }
                        } else if (personContextMenu.type !== 'deputy') {
                          // Person silme
                          deletePerson(personContextMenu.coordinatorId, personContextMenu.subUnitId, personContextMenu.person.id)
                          // MANUEL KONTROL: Otomatik layout devre dışı
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
          </>
        )}

        {/* SubUnit Context Menu */}
        {subUnitContextMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[299]"
              onClick={() => setSubUnitContextMenu(null)}
            />
            {/* Menu */}
            <div
              className="fixed z-[300] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
              style={{ left: subUnitContextMenu.x, top: subUnitContextMenu.y }}
              onClick={(e) => e.stopPropagation()}
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
                    responsibilities: existingSubUnit?.responsibilities || [],
                    deputyId: existingSubUnit?.deputyId || undefined,
                  },
                  deputies: coordinator?.deputies || [],
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

            <button
              onClick={() => {
                setSubUnitDeputyChangeModal({
                  coordinatorId: subUnitContextMenu.coordinatorId,
                  subUnitId: subUnitContextMenu.subUnitId,
                  subUnitTitle: subUnitContextMenu.subUnitTitle,
                })
                setSubUnitContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Koordinatör Yardımcısı Değiştir
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
                        // MANUEL KONTROL: Otomatik layout devre dışı
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
          </>
        )}

        {/* Connection Handle Modal - Kaynak yönü seçimi */}
        {connectionHandleModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-[90%]">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Bağlantı Yönü Seç
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">{connectionHandleModal.nodeName}</span> için bağlantı çıkış yönünü seçin:
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    startConnection(connectionHandleModal.nodeId, connectionHandleModal.nodeName, 'top')
                    setConnectionHandleModal(null)
                  }}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  Üstten (Top)
                </button>
                <button
                  onClick={() => {
                    startConnection(connectionHandleModal.nodeId, connectionHandleModal.nodeName, 'bottom')
                    setConnectionHandleModal(null)
                  }}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                >
                  Alttan (Bottom)
                </button>
              </div>
              <button
                onClick={() => setConnectionHandleModal(null)}
                className="mt-3 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Pending Target Modal - Hedef yönü seçimi */}
        {pendingTarget && connectionMode.active && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-[90%]">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Hedef Yönü Seç
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">{connectionMode.sourceName}</span> → <span className="font-semibold">
                  {(() => {
                    const coord = data.coordinators.find(c => c.id === pendingTarget.targetId)
                    const mainCoord = data.mainCoordinators.find(m => m.id === pendingTarget.targetId)
                    const exec = data.executives.find(e => e.id === pendingTarget.targetId)
                    const mgmt = data.management.find(m => m.id === pendingTarget.targetId)
                    return coord?.title || mainCoord?.title || exec?.name || mgmt?.name || 'Bilinmeyen'
                  })()}
                </span>
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Hedef node için bağlantı giriş yönünü seçin:
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    completeConnection(pendingTarget.targetId, 'top')
                    setPendingTarget(null)
                    showToast('Bağlantı oluşturuldu!', 'success')
                  }}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  Üstten (Top)
                </button>
                <button
                  onClick={() => {
                    completeConnection(pendingTarget.targetId, 'bottom')
                    setPendingTarget(null)
                    showToast('Bağlantı oluşturuldu!', 'success')
                  }}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                >
                  Alttan (Bottom)
                </button>
              </div>
              <button
                onClick={() => {
                  cancelConnection()
                  setPendingTarget(null)
                }}
                className="mt-3 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                İptal
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

        {/* Connection List Modal - Bağlantıları göster/kaldır */}
        {connectionListModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-[90%] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Bağlantılar
                </h3>
                <button
                  onClick={() => setConnectionListModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {(() => {
                const nodeConnections = customConnections.filter(
                  c => c.source === connectionListModal.nodeId || c.target === connectionListModal.nodeId
                )
                
                if (nodeConnections.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Bu node için bağlantı bulunmuyor.
                    </p>
                  )
                }
                
                return (
                  <div className="space-y-2">
                    {nodeConnections.map((conn, idx) => {
                      const sourceNode = data.coordinators.find(c => c.id === conn.source) ||
                        data.mainCoordinators.find(m => m.id === conn.source) ||
                        data.executives.find(e => e.id === conn.source) ||
                        data.management.find(m => m.id === conn.source)
                      const targetNode = data.coordinators.find(c => c.id === conn.target) ||
                        data.mainCoordinators.find(m => m.id === conn.target) ||
                        data.executives.find(e => e.id === conn.target) ||
                        data.management.find(m => m.id === conn.target)
                      
                      const sourceName = (sourceNode as any)?.title || (sourceNode as any)?.name || conn.source
                      const targetName = (targetNode as any)?.title || (targetNode as any)?.name || conn.target
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {sourceName} → {targetName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {conn.sourceHandle} → {conn.targetHandle}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              handleRemoveConnection(conn.source, conn.target)
                              showToast('Bağlantı kaldırıldı!', 'success')
                              if (nodeConnections.length === 1) {
                                setConnectionListModal(null)
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                          >
                            Kaldır
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
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

        {/* Personel Paneli */}
        <PersonnelPanel
          isOpen={personnelPanelOpen}
          onClose={() => setPersonnelPanelOpen(false)}
          personnel={getAllPersonnel()}
          onPersonClick={(person, metadata) => {
            // Personel kartını aç - tüm durumlar için viewPersonCard aç
            setViewPersonCard({
              person: person,
              coordinatorId: metadata.coordinatorId || '',
              subUnitId: metadata.subUnitId || '',
              coordinatorTitle: metadata.coordinatorTitle || '',
              subUnitTitle: metadata.subUnitTitle || metadata.city || '',
              city: metadata.city,
              type: metadata.type,
              role: metadata.role, // Şehir personeli için role bilgisi
            })
            setPersonnelPanelOpen(false)
          }}
          onPersonUpdate={(person, metadata, updates) => {
            // Personel güncelleme işlemi
            if (metadata.type === 'subunit-person' && metadata.coordinatorId && metadata.subUnitId && person.id) {
              updatePerson(metadata.coordinatorId, metadata.subUnitId, person.id, updates)
              showToast('Personel bilgileri güncellendi!', 'success')
            } else if (metadata.type === 'city-person' && metadata.city && metadata.role && person.id) {
              updateCityPerson(metadata.city, metadata.role, person.id, updates)
              showToast('Personel bilgileri güncellendi!', 'success')
            } else if (metadata.type === 'coordinator' && metadata.coordinatorId) {
              // Koordinatör güncelleme - coordinator field'ını güncelle
              updateCoordinator(metadata.coordinatorId, {
                coordinator: {
                  name: updates.name || person.name,
                  title: updates.title || person.title || 'Koordinatör',
                  color: updates.color || person.color,
                }
              })
              showToast('Koordinatör bilgileri güncellendi!', 'success')
            } else if (metadata.type === 'deputy' && metadata.coordinatorId) {
              // Deputy güncelleme - deputy array'inde güncelle
              const coordinator = data.coordinators.find(c => c.id === metadata.coordinatorId)
              if (coordinator) {
                const deputy = coordinator.deputies?.find(d => d.id === person.id)
                if (deputy) {
                  const updatedDeputies = coordinator.deputies?.map(d =>
                    d.id === person.id
                      ? {
                          ...d,
                          name: updates.name || d.name,
                          title: updates.title || d.title || '',
                          color: updates.color || d.color,
                        }
                      : d
                  )
                  updateCoordinator(metadata.coordinatorId, {
                    deputies: updatedDeputies || []
                  })
                  showToast('Koordinatör yardımcısı bilgileri güncellendi!', 'success')
                }
              }
            }
          }}
          onPersonMove={(person, metadata, toCoordinatorId, toSubUnitId) => {
            // Personel taşıma işlemi
            if (metadata.type === 'subunit-person' && metadata.coordinatorId && metadata.subUnitId && person.id) {
              movePerson(metadata.coordinatorId, metadata.subUnitId, person.id, toCoordinatorId, toSubUnitId)
              showToast(`${person.name} başka bir birime taşındı!`, 'success')
            }
          }}
          onPersonDelete={(person, metadata) => {
            // Personel silme işlemi
            try {
              if (metadata.type === 'subunit-person' && metadata.coordinatorId && metadata.subUnitId) {
                // person.id kontrolü - eğer yoksa person.name kullan
                const personId = person.id || person.name
                if (personId) {
                  deletePerson(metadata.coordinatorId, metadata.subUnitId, personId)
                  showToast(`${person.name} silindi!`, 'success')
                } else {
                  console.error('Person ID bulunamadı:', { person, metadata })
                  showToast('Personel ID bulunamadı', 'error')
                }
              } else if (metadata.type === 'deputy' && metadata.coordinatorId) {
                // Deputy için person.id kullan (getAllPersonnel'da deputy.id person.id olarak set ediliyor)
                const deputyId = person.id
                if (deputyId) {
                  deleteDeputy(metadata.coordinatorId, deputyId)
                  showToast(`${person.name} silindi!`, 'success')
                } else {
                  console.error('Deputy ID bulunamadı:', { person, metadata })
                  showToast('Koordinatör yardımcısı ID bulunamadı', 'error')
                }
              } else if (metadata.type === 'city-person' && metadata.city && metadata.role) {
                const personId = person.id || person.name
                if (personId) {
                  deleteCityPerson(metadata.city, metadata.role, personId)
                  showToast(`${person.name} silindi!`, 'success')
                } else {
                  console.error('City person ID bulunamadı:', { person, metadata })
                  showToast('Personel ID bulunamadı', 'error')
                }
              } else {
                console.error('Silme işlemi için gerekli bilgiler eksik:', { person, metadata })
                showToast('Personel silinirken bir hata oluştu', 'error')
              }
            } catch (error) {
              console.error('Personel silme hatası:', error)
              showToast('Personel silinirken bir hata oluştu', 'error')
            }
          }}
        />

      {/* Add Person Selection Modal */}
      {addPersonSelectionModal && (
        <AddPersonSelectionModal
          isOpen={!!addPersonSelectionModal}
          onClose={() => setAddPersonSelectionModal(null)}
          coordinatorId={addPersonSelectionModal.coordinatorId}
          subUnitId={addPersonSelectionModal.subUnitId}
          allPersonnel={getAllPersonnel().map(item => ({
            person: item.person,
            metadata: {
              type: item.type,
              coordinatorId: item.coordinatorId,
              coordinatorTitle: item.coordinatorTitle,
              subUnitId: item.subUnitId,
              subUnitTitle: item.subUnitTitle,
              city: item.city,
            },
          }))}
          onAddExisting={(personId, sourceCoordinatorId, sourceSubUnitId) => {
            // Kaynak birimden personeli bul
            const sourceCoordinator = data.coordinators.find(c => c.id === sourceCoordinatorId)
            const sourceSubUnit = sourceCoordinator?.subUnits?.find(su => su.id === sourceSubUnitId)
            const existingPerson = sourceSubUnit?.people?.find(p => p.id === personId)
            
            if (existingPerson) {
              // Personeli yeni birime ekle (aynı kişi, farklı birimlerde olabilir)
              // addPerson fonksiyonu Omit<Person, 'id'> bekliyor, yani ID'yi kendisi oluşturuyor
              // Ama biz aynı kişiyi eklemek istiyoruz, bu yüzden mevcut person verisini kullanıyoruz
              const { id, ...personWithoutId } = existingPerson
              addPerson(addPersonSelectionModal.coordinatorId, addPersonSelectionModal.subUnitId, personWithoutId)
              showToast(`${existingPerson.name} birime eklendi`, 'success')
              setTimeout(() => {
                setExpandedCoordinator(addPersonSelectionModal.coordinatorId)
                // Otomatik layout devre dışı - manuel pozisyonlar korunuyor
              }, 200)
            }
          }}
          onAddNew={() => {
            // Yeni personel ekleme modalını aç
            setFormModal({
              isOpen: true,
              type: 'person',
              title: 'Kişi Ekle',
              nodeId: addPersonSelectionModal.coordinatorId,
              initialData: {
                subUnitId: addPersonSelectionModal.subUnitId
              }
            })
          }}
        />
      )}

      {/* SubUnit Selection Modal (Personel Ata için) */}
      {subUnitSelectionModal && (() => {
        const coordinator = data.coordinators.find(c => c.id === subUnitSelectionModal.coordinatorId)
        const subUnits = coordinator?.subUnits || []
        return (
          <SubUnitSelectionModal
            isOpen={!!subUnitSelectionModal}
            onClose={() => setSubUnitSelectionModal(null)}
            coordinatorId={subUnitSelectionModal.coordinatorId}
            coordinatorTitle={subUnitSelectionModal.coordinatorTitle}
            subUnits={subUnits}
            onSelect={(subUnitId) => {
              // Birim seçildi, şimdi AddPersonSelectionModal'ı aç
              setAddPersonSelectionModal({
                coordinatorId: subUnitSelectionModal.coordinatorId,
                subUnitId: subUnitId,
              })
              setSubUnitSelectionModal(null)
            }}
          />
        )
      })()}

      {/* SubUnit Deputy Change Modal */}
      {subUnitDeputyChangeModal && (() => {
        const coordinator = data.coordinators.find(c => c.id === subUnitDeputyChangeModal.coordinatorId)
        const subUnit = coordinator?.subUnits?.find(su => su.id === subUnitDeputyChangeModal.subUnitId)
        const deputies = coordinator?.deputies || []

        return (
          <SubUnitDeputyChangeModal
            isOpen={!!subUnitDeputyChangeModal}
            onClose={() => setSubUnitDeputyChangeModal(null)}
            subUnitTitle={subUnitDeputyChangeModal.subUnitTitle}
            currentDeputyId={subUnit?.deputyId}
            deputies={deputies}
            onSave={(deputyId) => {
              if (subUnitDeputyChangeModal) {
                updateSubUnit(subUnitDeputyChangeModal.coordinatorId, subUnitDeputyChangeModal.subUnitId, {
                  deputyId: deputyId || undefined,
                })
                showToast('Koordinatör yardımcısı bağlantısı güncellendi', 'success')
                // Koordinatörü tekrar expand et
                setTimeout(() => {
                  setExpandedCoordinator(subUnitDeputyChangeModal.coordinatorId)
                  // MANUEL KONTROL: Otomatik layout devre dışı
                }, 200)
              }
              setSubUnitDeputyChangeModal(null)
            }}
          />
        )
      })()}

      {/* İl Personel Modalı */}
      {cityPersonnelModalOpen && selectedCity && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedCity} İl Personeli</h2>
                <p className="text-sm text-green-100">Toplumsal Çalışmalar Koordinatörlüğü</p>
              </div>
              <button
                onClick={() => {
                  setCityPersonnelModalOpen(false)
                  setSelectedCity(null)
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const cityPersonnel = getCityPersonnel()
                const cityData = cityPersonnel.find(cp => cp.city === selectedCity)
                const personnel = cityData?.people || []

                return (
                  <>
                    {/* Personel Listesi */}
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {personnel.length} personel bulundu
                      </p>
                      <button
                        onClick={() => {
                          setFormModal({
                            isOpen: true,
                            type: 'city-person',
                            title: `${selectedCity} - Yeni Personel Ekle`,
                            nodeId: 'toplumsal-calismalar',
                            initialData: {
                              city: selectedCity
                            }
                          })
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Yeni Personel Ekle
                      </button>
                    </div>

                    {personnel.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>Henüz personel eklenmemiş</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {personnel.map((person) => (
                          <div
                            key={person.id}
                            onClick={() => {
                              setViewPersonCard({
                                person: person,
                                coordinatorId: 'toplumsal-calismalar',
                                subUnitId: '',
                                coordinatorTitle: 'Toplumsal Çalışmalar Koordinatörlüğü',
                                subUnitTitle: selectedCity || '',
                                city: selectedCity,
                                type: 'city-person',
                              })
                            }}
                            className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-green-300 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start gap-3">
                              {person.photoData ? (
                                <img
                                  src={person.photoData}
                                  alt={person.name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                                  style={{ backgroundColor: person.color || '#10b981' }}
                                >
                                  {person.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800 truncate">{person.name}</h3>
                                <p className="text-sm text-gray-500 truncate mt-2">{person.title || 'Personel'}</p>
                                {person.email && (
                                  <p className="text-xs text-gray-400 truncate mt-1">{person.email}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
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

