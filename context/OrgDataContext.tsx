'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { 
  database, 
  ref, 
  onValue, 
  set, 
  get 
} from '@/lib/firebase'

// Types
export interface Person {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  notes?: string
  cvFileName?: string
  cvData?: string  // Base64 encoded file
}

export interface SubUnit {
  id: string
  title: string
  people: Person[]
  responsibilities: string[]
}

export interface Deputy {
  id: string
  name: string
  title: string
  responsibilities: string[]
}

export interface Coordinator {
  id: string
  title: string
  description: string
  responsibilities: string[]
  position: { x: number; y: number }
  parent: string
  hasDetailPage?: boolean
  coordinator?: { name: string; title: string }
  deputies: Deputy[]
  subUnits: SubUnit[]
  linkedSchemaId?: string
}

export interface MainCoordinator {
  id: string
  title: string
  description: string
  type: string
  position: { x: number; y: number }
  parent: string | null
}

export interface Executive {
  id: string
  name: string
  title: string
  type: string
  position: { x: number; y: number }
  parent: string
}

export interface Management {
  id: string
  name: string
  title: string
  type: string
  position: { x: number; y: number }
}

export interface OrgData {
  management: Management[]
  executives: Executive[]
  mainCoordinators: MainCoordinator[]
  coordinators: Coordinator[]
}

export interface Project {
  id: string
  name: string
  createdAt: number
  isMain?: boolean
}

interface OrgDataContextType {
  data: OrgData
  projects: Project[]
  activeProjectId: string
  isLocked: boolean
  positions: Record<string, { x: number; y: number }>
  customConnections: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>
  isLoading: boolean
  updateCoordinator: (id: string, updates: Partial<Coordinator>) => void
  addSubUnit: (coordinatorId: string, subUnit: Omit<SubUnit, 'id'>) => void
  addDeputy: (coordinatorId: string, deputy: Omit<Deputy, 'id'>) => void
  addResponsibility: (coordinatorId: string, responsibility: string) => void
  addPerson: (coordinatorId: string, subUnitId: string, person: Omit<Person, 'id'>) => void
  updatePerson: (coordinatorId: string, subUnitId: string, personId: string, updates: Partial<Person>) => void
  deleteSubUnit: (coordinatorId: string, subUnitId: string) => void
  deleteDeputy: (coordinatorId: string, deputyId: string) => void
  deleteCoordinator: (id: string) => void
  deleteNode: (id: string, nodeType: string) => void
  addCoordinator: (parentId: string, coordinator: Omit<Coordinator, 'id'> & { position?: { x: number; y: number } }) => void
  addManagement: (management: Omit<Management, 'id'>) => void
  addExecutive: (executive: Omit<Executive, 'id'>) => void
  addMainCoordinator: (mainCoordinator: Omit<MainCoordinator, 'id'>) => void
  linkSchemaToCoordinator: (schemaId: string, coordinatorId: string) => void
  unlinkSchemaFromCoordinator: (coordinatorId: string) => void
  getLinkedSchemaData: (schemaId: string) => OrgData | null
  resetToEmpty: () => void
  saveData: () => void
  loadData: () => void
  setActiveProject: (projectId: string) => void
  createProject: (name: string, isMain?: boolean) => void
  deleteProject: (projectId: string) => void
  setLocked: (locked: boolean) => void
  updatePositions: (newPositions: Record<string, { x: number; y: number }>) => void
  addConnection: (connection: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => void
  removeConnection: (source: string, target: string) => void
}

const OrgDataContext = createContext<OrgDataContextType | null>(null)

// Initial data from org.json structure
const initialData: OrgData = {
  management: [
    {
      id: "selcuk-bayraktar",
      name: "Selçuk Bayraktar",
      title: "Yönetim Kurulu Başkanı",
      type: "chairman",
      position: { x: 600, y: 50 }
    }
  ],
  executives: [
    {
      id: "toplumsal-calismalar",
      name: "Toplumsal Çalışmalar Koordinatörlüğü",
      title: "Koordinatörlük",
      type: "special",
      position: { x: 50, y: 50 },
      parent: "selcuk-bayraktar"
    },
    {
      id: "elvan-kuzucu",
      name: "Elvan Kuzucu Hıdır",
      title: "Genel Müdür Yardımcısı",
      type: "executive",
      position: { x: 400, y: 150 },
      parent: "selcuk-bayraktar"
    },
    {
      id: "muhammet-saymaz",
      name: "Muhammet Saymaz",
      title: "Genel Müdür Yardımcısı",
      type: "executive",
      position: { x: 800, y: 150 },
      parent: "selcuk-bayraktar"
    }
  ],
  mainCoordinators: [
    {
      id: "t3-vakfi-koordinatorlukleri",
      title: "T3 Vakfı Koordinatörlükleri",
      description: "T3 Vakfı bünyesindeki tüm koordinatörlükler",
      type: "main-coordinator",
      position: { x: 250, y: 280 },
      parent: "elvan-kuzucu"
    },
    {
      id: "teknofest-koordinatorlukleri",
      title: "Teknofest Koordinatörlükleri",
      description: "Teknofest etkinlikleri koordinatörlükleri",
      type: "main-coordinator",
      position: { x: 950, y: 280 },
      parent: "muhammet-saymaz"
    },
    {
      id: "t3-teknofest-koordinatorlukleri",
      title: "T3 Vakfı / Teknofest Koordinatörlükleri",
      description: "Her iki yapıya da hizmet veren koordinatörlükler",
      type: "main-coordinator",
      position: { x: 600, y: 750 },
      parent: null
    }
  ],
  coordinators: [
    {
      id: "satin-alma",
      title: "Satın Alma Birimi",
      description: "Satın alma ve tedarik işlemleri",
      responsibilities: ["Tedarikçi yönetimi", "Satın alma süreçleri", "Fiyat müzakereleri", "Sözleşme yönetimi"],
      position: { x: 30, y: 400 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "bursiyer",
      title: "Bursiyer Koordinatörlüğü",
      description: "Burs programları yönetimi",
      responsibilities: ["Burs başvuru yönetimi", "Bursiyer takibi", "Mentorluk programları", "Kariyer rehberliği"],
      position: { x: 200, y: 400 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "mimari-tasarim",
      title: "Mimari Tasarım ve Planlama Koordinatörlüğü",
      description: "Mekan tasarımı ve planlama",
      responsibilities: ["Mekan tasarımları", "Proje planlaması", "İnşaat koordinasyonu", "Teknik çizimler"],
      position: { x: 370, y: 400 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "insan-kaynaklari",
      title: "İnsan Kaynakları Koordinatörlüğü",
      description: "İnsan kaynakları yönetimi",
      responsibilities: ["İşe alım süreçleri", "Performans yönetimi", "Eğitim ve gelişim", "Özlük işleri"],
      position: { x: 30, y: 490 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "t3-girisim-merkezi",
      title: "T3 Girişim Merkezi Koordinatörlüğü",
      description: "Girişimcilik ve inovasyon merkezi yönetimi",
      responsibilities: ["Girişimcilik programları yönetimi", "Startup destekleme", "Mentor ağı koordinasyonu", "Demo Day organizasyonları"],
      position: { x: 200, y: 490 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "egitim-arge",
      title: "Eğitim ve AR-GE Koordinatörlüğü",
      description: "Eğitim programları ve araştırma geliştirme",
      responsibilities: ["Eğitim müfredatı geliştirme", "AR-GE projeleri yönetimi", "Akademik işbirlikleri", "İnovasyon araştırmaları"],
      position: { x: 370, y: 490 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "muhasebe",
      title: "Muhasebe Birimi",
      description: "Mali işler ve muhasebe",
      responsibilities: ["Muhasebe kayıtları", "Mali raporlama", "Bütçe takibi", "Vergi işlemleri"],
      position: { x: 30, y: 580 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "bilisim-teknolojileri",
      title: "Bilişim Teknolojileri Koordinatörlüğü",
      description: "IT altyapı ve yazılım yönetimi",
      responsibilities: ["IT altyapı yönetimi", "Yazılım geliştirme", "Siber güvenlik", "Teknik destek"],
      position: { x: 200, y: 580 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-yarismalar",
      title: "Teknofest Yarışmalar Koordinatörlüğü",
      description: "Teknoloji yarışmaları yönetimi",
      responsibilities: ["Yarışma organizasyonu", "Jüri koordinasyonu", "Başvuru yönetimi", "Ödül törenleri"],
      position: { x: 370, y: 580 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "deneyap-koordinatorlugu",
      title: "DENEYAP Koordinatörlüğü",
      description: "DENEYAP Teknoloji Atölyeleri yönetimi",
      responsibilities: ["DENEYAP atölye yönetimi", "Eğitmen koordinasyonu", "Öğrenci takibi", "Teknoloji eğitimleri"],
      position: { x: 120, y: 670 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "deneyap-kart",
      title: "DENEYAP Kart Birimi",
      description: "DENEYAP Kart üretim ve dağıtım",
      responsibilities: ["Kart üretimi koordinasyonu", "Dağıtım planlaması", "Stok yönetimi", "Kalite kontrol"],
      position: { x: 290, y: 670 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-ulasim",
      title: "Teknofest Ulaşım Koordinatörlüğü",
      description: "Teknofest etkinlik ulaşım lojistiği",
      responsibilities: ["Ulaşım planlaması", "Araç koordinasyonu", "Katılımcı transferleri", "Lojistik yönetimi"],
      position: { x: 800, y: 400 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-satis-pazarlama",
      title: "Teknofest Satış ve Pazarlama Koordinatörlüğü",
      description: "Pazarlama ve sponsorluk yönetimi",
      responsibilities: ["Sponsorluk yönetimi", "Pazarlama stratejisi", "Marka yönetimi", "Satış operasyonları"],
      position: { x: 970, y: 400 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-fuar",
      title: "Teknofest Fuar Koordinatörlüğü",
      description: "Fuar alanı ve sergi yönetimi",
      responsibilities: ["Fuar alanı tasarımı", "Stand koordinasyonu", "Sergi düzenlemesi", "Katılımcı ilişkileri"],
      position: { x: 1140, y: 400 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-yarismalar-tf",
      title: "Teknofest Yarışmalar Koordinatörlüğü",
      description: "Teknofest yarışmaları yönetimi",
      responsibilities: ["Yarışma organizasyonu", "Jüri koordinasyonu", "Başvuru yönetimi", "Ödül törenleri"],
      position: { x: 850, y: 490 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-operasyon",
      title: "Teknofest Operasyon Koordinatörlüğü",
      description: "Etkinlik operasyonları yönetimi",
      responsibilities: ["Saha operasyonları", "Güvenlik koordinasyonu", "Teknik altyapı", "Acil durum yönetimi"],
      position: { x: 1050, y: 490 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "idari-isler",
      title: "İdari İşler Koordinatörlüğü",
      description: "İdari işler ve genel hizmetler",
      responsibilities: ["Genel idari işler", "Ofis yönetimi", "Tedarik süreçleri", "Tesis yönetimi"],
      position: { x: 500, y: 870 },
      parent: "t3-teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "kurumsal-iletisim",
      title: "Kurumsal İletişim Koordinatörlüğü",
      description: "Kurumsal iletişim ve halkla ilişkiler",
      responsibilities: [
        "Kurumsal iletişim stratejisinin yönetimi",
        "Kurumsal kimlik ve marka standartlarının korunması",
        "İletişim ekipleri ve süreçlerinin koordinasyonu",
        "Medya, kriz ve paydaş iletişiminin yürütülmesi"
      ],
      position: { x: 700, y: 870 },
      parent: "t3-teknofest-koordinatorlukleri",
      hasDetailPage: true,
      coordinator: {
        name: "Büşra COŞKUN",
        title: "Kurumsal İletişim Koordinatörü"
      },
      deputies: [
        {
          id: "meryem-hamidi",
          name: "Meryem Hamidi",
          title: "Koordinatör Yardımcısı",
          responsibilities: [
            "İletişim süreçlerinin operasyonel takibi",
            "Birimler arası koordinasyon",
            "Proje, bütçe ve takvim takibi",
            "Raporlama ve süreç iyileştirme"
          ]
        },
        {
          id: "busra-takalak",
          name: "Büşra Takalak",
          title: "Koordinatör Yardımcısı",
          responsibilities: [
            "İletişim süreçlerinin operasyonel takibi",
            "Birimler arası koordinasyon",
            "Proje, bütçe ve takvim takibi",
            "Raporlama ve süreç iyileştirme"
          ]
        }
      ],
      subUnits: [
        {
          id: "iletisim-birimi",
          title: "İletişim",
          people: [
            { id: "p1", name: "Zahide Sara Yılmaz" },
            { id: "p2", name: "Dilara Fındıkcı" },
            { id: "p3", name: "Tarkan Murat Korkmaz" }
          ],
          responsibilities: [
            "İç ve dış iletişim süreçlerinin koordinasyonu",
            "Paydaş ve kurumsal iletişim faaliyetlerinin yürütülmesi",
            "Dijital, basılı ve etkinlik iletişim içeriklerinin takibi",
            "Kurumsal kimlik ve iletişim standartlarının korunması"
          ]
        },
        {
          id: "editor-birimi",
          title: "Editör",
          people: [
            { id: "p4", name: "Zeynep Hilal Demirci" }
          ],
          responsibilities: [
            "Kurumsal içeriklerin hazırlanması ve düzenlenmesi",
            "Metinlerin dil, format ve doğruluk kontrolü",
            "Resmi yazı ve yayın metinlerinin oluşturulması",
            "İçerik kalite ve yayın standartlarının sağlanması"
          ]
        },
        {
          id: "tasarim-birimi",
          title: "Tasarım",
          people: [
            { id: "p5", name: "Merve Nur Sukas" },
            { id: "p6", name: "Betül Tüfekci" },
            { id: "p7", name: "Nedim Furkan Gönenç" }
          ],
          responsibilities: [
            "Görsel tasarım konseptlerinin geliştirilmesi ve uygulanması",
            "Kurumsal kimliğe uygun tasarım üretimi",
            "Dijital, basılı ve alan tasarımlarının hazırlanması",
            "Tasarım kalite, teknik ve marka bütünlüğünün sağlanması"
          ]
        },
        {
          id: "sosyal-medya-birimi",
          title: "Sosyal Medya",
          people: [
            { id: "p8", name: "İsmet Selim Sirkeci" }
          ],
          responsibilities: [
            "Sosyal medya içeriklerinin üretilmesi ve yönetimi",
            "Kurumsal standartlara uygun paylaşım ve onay süreçleri",
            "Canlı yayın, fotoğraf ve video içeriklerinin koordinasyonu",
            "Sosyal medya performans, etkileşim ve trend takibi"
          ]
        },
        {
          id: "basin-birimi",
          title: "Basın",
          people: [
            { id: "p9", name: "Enes Furkan Gönenç" }
          ],
          responsibilities: [
            "Basın görünürlüğü ve medya ilişkilerinin yönetimi",
            "Basın bülteni, röportaj ve yayın süreçlerinin koordinasyonu",
            "PR ajansı ve medya kuruluşlarıyla iletişim",
            "Basın takibi, arşivleme ve kriz iletişimi"
          ]
        },
        {
          id: "web-siteleri-birimi",
          title: "Web Siteleri",
          people: [
            { id: "p10", name: "Rümeysa Ersöz" },
            { id: "p11", name: "Necip Karaman" }
          ],
          responsibilities: [
            "Web sitesi ve mobil uygulama içeriklerinin yönetimi",
            "İçerik girişleri, güncellemeler ve haber akışı takibi",
            "Dijital platformlarda medya, yayın ve canlı yayın koordinasyonu",
            "Dijital içerik kalite ve kullanıcı deneyimi iyileştirme"
          ]
        }
      ]
    }
  ]
}

export function OrgDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OrgData>(initialData)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string>('main')
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [customConnections, setCustomConnections] = useState<Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Generate unique ID
  const generateId = useCallback(() => {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Firebase'den verileri dinle - gerçek zamanlı senkronizasyon
  useEffect(() => {
    setIsLoading(true)
    
    // Projeleri dinle
    const projectsRef = ref(database, 'projects')
    const unsubProjects = onValue(projectsRef, (snapshot) => {
      const val = snapshot.val()
      if (val) {
        const projectList: Project[] = Object.entries(val).map(([id, p]) => ({
          id,
          ...(p as Omit<Project, 'id'>)
        }))
        setProjects(projectList)
        
        // Eğer main proje yoksa oluştur
        if (!projectList.find(p => p.id === 'main')) {
          const mainProject: Project = { id: 'main', name: 'Ana Şema', createdAt: Date.now(), isMain: true }
          set(ref(database, 'projects/main'), mainProject)
        }
      } else {
        // İlk kez açılıyorsa varsayılan projeyi oluştur
        const mainProject: Project = { id: 'main', name: 'Ana Şema', createdAt: Date.now(), isMain: true }
        set(ref(database, 'projects/main'), mainProject)
        setProjects([mainProject])
      }
    })

    // Aktif proje ID'sini dinle
    const activeRef = ref(database, 'settings/activeProjectId')
    const unsubActive = onValue(activeRef, (snapshot) => {
      const val = snapshot.val()
      if (val) {
        setActiveProjectId(val)
      } else {
        setActiveProjectId('main')
      }
    })

    // Kilit durumunu dinle
    const lockedRef = ref(database, 'settings/locked')
    const unsubLocked = onValue(lockedRef, (snapshot) => {
      setIsLocked(snapshot.val() === true)
    })

    return () => {
      unsubProjects()
      unsubActive()
      unsubLocked()
    }
  }, [])

  // Aktif projenin verilerini dinle
  useEffect(() => {
    if (!activeProjectId) return

    // Org data dinle
    const orgDataRef = ref(database, `orgData/${activeProjectId}`)
    const unsubData = onValue(orgDataRef, (snapshot) => {
      const val = snapshot.val()
      if (val) {
        setData(val)
      } else if (activeProjectId === 'main') {
        // Ana şema için varsayılan verileri yükle
        setData(initialData)
        set(orgDataRef, initialData)
      } else {
        // Yeni proje için boş veri
        setData({ management: [], executives: [], mainCoordinators: [], coordinators: [] })
      }
      setIsLoading(false)
    })

    // Pozisyonları dinle
    const posRef = ref(database, `positions/${activeProjectId}`)
    const unsubPos = onValue(posRef, (snapshot) => {
      const val = snapshot.val()
      setPositions(val || {})
    })

    // Bağlantıları dinle
    const connRef = ref(database, `connections/${activeProjectId}`)
    const unsubConn = onValue(connRef, (snapshot) => {
      const val = snapshot.val()
      setCustomConnections(val || [])
    })

    return () => {
      unsubData()
      unsubPos()
      unsubConn()
    }
  }, [activeProjectId])

  // Firebase'e veri kaydet
  const saveToFirebase = useCallback((newData: OrgData) => {
    if (activeProjectId) {
      set(ref(database, `orgData/${activeProjectId}`), newData)
    }
  }, [activeProjectId])

  // Pozisyonları kaydet
  const updatePositions = useCallback((newPositions: Record<string, { x: number; y: number }>) => {
    if (activeProjectId) {
      set(ref(database, `positions/${activeProjectId}`), newPositions)
    }
  }, [activeProjectId])

  // Bağlantı ekle
  const addConnection = useCallback((connection: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => {
    const newConnections = [...customConnections, connection]
    if (activeProjectId) {
      set(ref(database, `connections/${activeProjectId}`), newConnections)
    }
  }, [activeProjectId, customConnections])

  // Bağlantı kaldır
  const removeConnection = useCallback((source: string, target: string) => {
    const newConnections = customConnections.filter(c => !(c.source === source && c.target === target))
    if (activeProjectId) {
      set(ref(database, `connections/${activeProjectId}`), newConnections)
    }
  }, [activeProjectId, customConnections])

  // Kilit durumunu değiştir
  const setLocked = useCallback((locked: boolean) => {
    set(ref(database, 'settings/locked'), locked)
  }, [])

  // Aktif projeyi değiştir
  const setActiveProject = useCallback((projectId: string) => {
    set(ref(database, 'settings/activeProjectId'), projectId)
  }, [])

  // Yeni proje oluştur
  const createProject = useCallback((name: string, isMain?: boolean) => {
    const id = isMain ? 'main' : generateId()
    const project: Project = { id, name, createdAt: Date.now(), isMain }
    set(ref(database, `projects/${id}`), project)
    setActiveProject(id)
  }, [generateId, setActiveProject])

  // Proje sil
  const deleteProject = useCallback((projectId: string) => {
    if (projectId === 'main') return // Ana şema silinemez
    set(ref(database, `projects/${projectId}`), null)
    set(ref(database, `orgData/${projectId}`), null)
    set(ref(database, `positions/${projectId}`), null)
    set(ref(database, `connections/${projectId}`), null)
    if (activeProjectId === projectId) {
      setActiveProject('main')
    }
  }, [activeProjectId, setActiveProject])

  // Save to Firebase (compatibility)
  const saveData = useCallback(() => {
    saveToFirebase(data)
  }, [data, saveToFirebase])

  // Load from Firebase (compatibility)
  const loadData = useCallback(() => {
    // onValue dinleyicisi zaten yüklüyor
  }, [])

  // Reset to empty canvas
  const resetToEmpty = useCallback(() => {
    const emptyData: OrgData = {
      management: [],
      executives: [],
      mainCoordinators: [],
      coordinators: []
    }
    setData(emptyData)
    saveToFirebase(emptyData)
  }, [saveToFirebase])

  // Update coordinator
  const updateCoordinator = useCallback((id: string, updates: Partial<Coordinator>) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === id ? { ...c, ...updates } : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Add sub unit
  const addSubUnit = useCallback((coordinatorId: string, subUnit: Omit<SubUnit, 'id'>) => {
    const newSubUnit: SubUnit = {
      ...subUnit,
      id: generateId(),
    }
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? { ...c, subUnits: [...(c.subUnits || []), newSubUnit], hasDetailPage: true }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [generateId, saveToFirebase])

  // Add deputy
  const addDeputy = useCallback((coordinatorId: string, deputy: Omit<Deputy, 'id'>) => {
    const newDeputy: Deputy = {
      ...deputy,
      id: generateId(),
    }
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? { ...c, deputies: [...(c.deputies || []), newDeputy], hasDetailPage: true }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [generateId, saveToFirebase])

  // Add responsibility
  const addResponsibility = useCallback((coordinatorId: string, responsibility: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? { ...c, responsibilities: [...(c.responsibilities || []), responsibility] }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Add person to sub unit
  const addPerson = useCallback((coordinatorId: string, subUnitId: string, person: Omit<Person, 'id'>) => {
    const newPerson: Person = {
      ...person,
      id: generateId(),
    }
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? {
                ...c,
                subUnits: (c.subUnits || []).map(su =>
                  su.id === subUnitId
                    ? { ...su, people: [...(su.people || []), newPerson] }
                    : su
                )
              }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [generateId, saveToFirebase])

  // Update person in sub unit
  const updatePerson = useCallback((coordinatorId: string, subUnitId: string, personId: string, updates: Partial<Person>) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? {
                ...c,
                subUnits: (c.subUnits || []).map(su =>
                  su.id === subUnitId
                    ? {
                        ...su,
                        people: (su.people || []).map(p =>
                          p.id === personId ? { ...p, ...updates } : p
                        )
                      }
                    : su
                )
              }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Delete sub unit
  const deleteSubUnit = useCallback((coordinatorId: string, subUnitId: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? { ...c, subUnits: (c.subUnits || []).filter(su => su.id !== subUnitId) }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Delete deputy
  const deleteDeputy = useCallback((coordinatorId: string, deputyId: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => 
          c.id === coordinatorId 
            ? { ...c, deputies: (c.deputies || []).filter(d => d.id !== deputyId) }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Delete coordinator
  const deleteCoordinator = useCallback((id: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.filter(c => c.id !== id)
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Delete any node by type
  const deleteNode = useCallback((id: string, nodeType: string) => {
    setData(prev => {
      let newData: OrgData
      switch (nodeType) {
        case 'chairman':
          newData = { ...prev, management: prev.management.filter(m => m.id !== id) }
          break
        case 'executive':
          newData = { ...prev, executives: prev.executives.filter(e => e.id !== id) }
          break
        case 'mainCoordinator':
          newData = { ...prev, mainCoordinators: prev.mainCoordinators.filter(mc => mc.id !== id) }
          break
        case 'coordinator':
        case 'subCoordinator':
          newData = { ...prev, coordinators: prev.coordinators.filter(c => c.id !== id) }
          break
        default:
          newData = prev
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Add new coordinator
  const addCoordinator = useCallback((parentId: string, coordinator: Omit<Coordinator, 'id'> & { position?: { x: number; y: number } }) => {
    const parent = data.coordinators.find(c => c.id === parentId) ||
                   data.mainCoordinators.find(m => m.id === parentId)
    
    const siblingCount = data.coordinators.filter(c => c.parent === parentId).length
    
    const newCoordinator: Coordinator = {
      ...coordinator,
      id: generateId(),
      position: coordinator.position || {
        x: (parent?.position.x || 500) + (siblingCount * 170),
        y: (parent?.position.y || 300) + 100,
      },
      parent: parentId,
      deputies: coordinator.deputies || [],
      subUnits: coordinator.subUnits || [],
    }
    
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: [...prev.coordinators, newCoordinator]
      }
      saveToFirebase(newData)
      return newData
    })
  }, [data, generateId, saveToFirebase])

  // Add new management (chairman)
  const addManagement = useCallback((management: Omit<Management, 'id'>) => {
    const newManagement: Management = {
      ...management,
      id: generateId(),
    }
    setData(prev => {
      const newData = {
        ...prev,
        management: [...prev.management, newManagement]
      }
      saveToFirebase(newData)
      return newData
    })
  }, [generateId, saveToFirebase])

  // Add new executive
  const addExecutive = useCallback((executive: Omit<Executive, 'id'>) => {
    const newExecutive: Executive = {
      ...executive,
      id: generateId(),
    }
    setData(prev => {
      const newData = {
        ...prev,
        executives: [...prev.executives, newExecutive]
      }
      saveToFirebase(newData)
      return newData
    })
  }, [generateId, saveToFirebase])

  // Add new main coordinator
  const addMainCoordinator = useCallback((mainCoordinator: Omit<MainCoordinator, 'id'>) => {
    const newMainCoordinator: MainCoordinator = {
      ...mainCoordinator,
      id: generateId(),
    }
    setData(prev => {
      const newData = {
        ...prev,
        mainCoordinators: [...prev.mainCoordinators, newMainCoordinator]
      }
      saveToFirebase(newData)
      return newData
    })
  }, [generateId, saveToFirebase])

  // Link schema to coordinator
  const linkSchemaToCoordinator = useCallback((schemaId: string, coordinatorId: string) => {
    // Ana şema verisini al ve güncelle
    get(ref(database, 'orgData/main')).then(snapshot => {
      const mainData = snapshot.val() as OrgData
      if (mainData) {
        const updatedCoordinators = mainData.coordinators.map(coord => 
          coord.id === coordinatorId 
            ? { ...coord, linkedSchemaId: schemaId, hasDetailPage: true }
            : coord
        )
        set(ref(database, 'orgData/main'), { ...mainData, coordinators: updatedCoordinators })
      }
    })
  }, [])

  // Unlink schema from coordinator
  const unlinkSchemaFromCoordinator = useCallback((coordinatorId: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(coord =>
          coord.id === coordinatorId
            ? { ...coord, linkedSchemaId: undefined }
            : coord
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Get linked schema data
  const getLinkedSchemaData = useCallback((schemaId: string): OrgData | null => {
    // Bu senkron bir fonksiyon olduğu için Firebase'den anlık okuma yapmak zor
    // Şimdilik null döndürüyoruz, gerekirse ayrı bir async fonksiyon yazılabilir
    return null
  }, [])

  return (
    <OrgDataContext.Provider value={{
      data,
      projects,
      activeProjectId,
      isLocked,
      positions,
      customConnections,
      isLoading,
      updateCoordinator,
      addSubUnit,
      addDeputy,
      addResponsibility,
      addPerson,
      updatePerson,
      deleteSubUnit,
      deleteDeputy,
      deleteCoordinator,
      deleteNode,
      addCoordinator,
      addManagement,
      addExecutive,
      addMainCoordinator,
      linkSchemaToCoordinator,
      unlinkSchemaFromCoordinator,
      getLinkedSchemaData,
      resetToEmpty,
      saveData,
      loadData,
      setActiveProject,
      createProject,
      deleteProject,
      setLocked,
      updatePositions,
      addConnection,
      removeConnection,
    }}>
      {children}
    </OrgDataContext.Provider>
  )
}

export function useOrgData() {
  const context = useContext(OrgDataContext)
  if (!context) {
    throw new Error('useOrgData must be used within OrgDataProvider')
  }
  return context
}
