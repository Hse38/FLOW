'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  linkedSchemaId?: string  // Bağlı şema ID'si (yeni şemadan bağlanmış)
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

interface OrgDataContextType {
  data: OrgData
  updateCoordinator: (id: string, updates: Partial<Coordinator>) => void
  addSubUnit: (coordinatorId: string, subUnit: Omit<SubUnit, 'id'>) => void
  addDeputy: (coordinatorId: string, deputy: Omit<Deputy, 'id'>) => void
  addResponsibility: (coordinatorId: string, responsibility: string) => void
  addPerson: (coordinatorId: string, subUnitId: string, person: Omit<Person, 'id'>) => void
  updatePerson: (coordinatorId: string, subUnitId: string, personId: string, updates: Partial<Person>) => void
  deleteSubUnit: (coordinatorId: string, subUnitId: string) => void
  deleteDeputy: (coordinatorId: string, deputyId: string) => void
  deleteCoordinator: (id: string) => void
  addCoordinator: (parentId: string, coordinator: Omit<Coordinator, 'id' | 'position'>) => void
  addManagement: (management: Omit<Management, 'id'>) => void
  addExecutive: (executive: Omit<Executive, 'id'>) => void
  addMainCoordinator: (mainCoordinator: Omit<MainCoordinator, 'id'>) => void
  linkSchemaToCoordinator: (schemaId: string, coordinatorId: string) => void
  unlinkSchemaFromCoordinator: (coordinatorId: string) => void
  getLinkedSchemaData: (schemaId: string) => OrgData | null
  resetToEmpty: () => void
  saveData: () => void
  loadData: () => void
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

  // Clear old localStorage on mount to prevent corruption
  useEffect(() => {
    // Aktif projenin verilerini yükle
    if (typeof window !== 'undefined') {
      const activeProjectId = localStorage.getItem('activeProjectId')
      if (activeProjectId) {
        const projectData = localStorage.getItem(`orgData_${activeProjectId}`)
        if (projectData) {
          try {
            const parsed = JSON.parse(projectData)
            setData(parsed)
            return
          } catch (e) {
            console.error('Failed to parse project data:', e)
          }
        }
      }
    }
    // Varsayılan olarak initialData kullan
    setData(initialData)
  }, [])

  // Save to localStorage
  const saveData = () => {
    if (typeof window !== 'undefined') {
      const activeProjectId = localStorage.getItem('activeProjectId')
      if (activeProjectId) {
        localStorage.setItem(`orgData_${activeProjectId}`, JSON.stringify(data))
      }
    }
  }

  // Load from localStorage
  const loadData = () => {
    if (typeof window !== 'undefined') {
      const activeProjectId = localStorage.getItem('activeProjectId')
      if (activeProjectId) {
        const projectData = localStorage.getItem(`orgData_${activeProjectId}`)
        if (projectData) {
          try {
            setData(JSON.parse(projectData))
            return
          } catch (e) {
            console.error('Failed to parse project data:', e)
          }
        }
      }
    }
    setData(initialData)
  }

  // Reset to empty canvas
  const resetToEmpty = () => {
    const emptyData: OrgData = {
      management: [],
      executives: [],
      mainCoordinators: [],
      coordinators: []
    }
    setData(emptyData)
    setTimeout(saveData, 0)
  }

  // Generate unique ID
  const generateId = () => {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Update coordinator
  const updateCoordinator = (id: string, updates: Partial<Coordinator>) => {
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
    }))
    saveData()
  }

  // Add sub unit
  const addSubUnit = (coordinatorId: string, subUnit: Omit<SubUnit, 'id'>) => {
    const newSubUnit: SubUnit = {
      ...subUnit,
      id: generateId(),
    }
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(c => 
        c.id === coordinatorId 
          ? { ...c, subUnits: [...(c.subUnits || []), newSubUnit], hasDetailPage: true }
          : c
      )
    }))
    setTimeout(saveData, 0)
  }

  // Add deputy
  const addDeputy = (coordinatorId: string, deputy: Omit<Deputy, 'id'>) => {
    const newDeputy: Deputy = {
      ...deputy,
      id: generateId(),
    }
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(c => 
        c.id === coordinatorId 
          ? { ...c, deputies: [...(c.deputies || []), newDeputy], hasDetailPage: true }
          : c
      )
    }))
    setTimeout(saveData, 0)
  }

  // Add responsibility
  const addResponsibility = (coordinatorId: string, responsibility: string) => {
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(c => 
        c.id === coordinatorId 
          ? { ...c, responsibilities: [...(c.responsibilities || []), responsibility] }
          : c
      )
    }))
    setTimeout(saveData, 0)
  }

  // Add person to sub unit
  const addPerson = (coordinatorId: string, subUnitId: string, person: Omit<Person, 'id'>) => {
    const newPerson: Person = {
      ...person,
      id: generateId(),
    }
    setData(prev => ({
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
    }))
    setTimeout(saveData, 0)
  }

  // Update person in sub unit
  const updatePerson = (coordinatorId: string, subUnitId: string, personId: string, updates: Partial<Person>) => {
    setData(prev => ({
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
    }))
    setTimeout(saveData, 0)
  }

  // Delete sub unit
  const deleteSubUnit = (coordinatorId: string, subUnitId: string) => {
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(c => 
        c.id === coordinatorId 
          ? { ...c, subUnits: (c.subUnits || []).filter(su => su.id !== subUnitId) }
          : c
      )
    }))
    setTimeout(saveData, 0)
  }

  // Delete deputy
  const deleteDeputy = (coordinatorId: string, deputyId: string) => {
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(c => 
        c.id === coordinatorId 
          ? { ...c, deputies: (c.deputies || []).filter(d => d.id !== deputyId) }
          : c
      )
    }))
    setTimeout(saveData, 0)
  }

  // Delete coordinator
  const deleteCoordinator = (id: string) => {
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.filter(c => c.id !== id)
    }))
    setTimeout(saveData, 0)
  }

  // Add new coordinator
  const addCoordinator = (parentId: string, coordinator: Omit<Coordinator, 'id' | 'position'>) => {
    // Find parent to calculate position
    const parent = data.coordinators.find(c => c.id === parentId) ||
                   data.mainCoordinators.find(m => m.id === parentId)
    
    const siblingCount = data.coordinators.filter(c => c.parent === parentId).length
    
    const newCoordinator: Coordinator = {
      ...coordinator,
      id: generateId(),
      position: {
        x: (parent?.position.x || 500) + (siblingCount * 170),
        y: (parent?.position.y || 300) + 100,
      },
      parent: parentId,
      deputies: [],
      subUnits: [],
    }
    
    setData(prev => ({
      ...prev,
      coordinators: [...prev.coordinators, newCoordinator]
    }))
    setTimeout(saveData, 0)
  }

  // Add new management (chairman)
  const addManagement = (management: Omit<Management, 'id'>) => {
    const newManagement: Management = {
      ...management,
      id: generateId(),
    }
    setData(prev => ({
      ...prev,
      management: [...prev.management, newManagement]
    }))
    setTimeout(saveData, 0)
  }

  // Add new executive
  const addExecutive = (executive: Omit<Executive, 'id'>) => {
    const newExecutive: Executive = {
      ...executive,
      id: generateId(),
    }
    setData(prev => ({
      ...prev,
      executives: [...prev.executives, newExecutive]
    }))
    setTimeout(saveData, 0)
  }

  // Add new main coordinator
  const addMainCoordinator = (mainCoordinator: Omit<MainCoordinator, 'id'>) => {
    const newMainCoordinator: MainCoordinator = {
      ...mainCoordinator,
      id: generateId(),
    }
    setData(prev => ({
      ...prev,
      mainCoordinators: [...prev.mainCoordinators, newMainCoordinator]
    }))
    setTimeout(saveData, 0)
  }

  // Şemayı koordinatöre bağla (ana şemadaki bir koordinatörün altına yeni şema bağla)
  const linkSchemaToCoordinator = (schemaId: string, coordinatorId: string) => {
    // Ana şema verisini al
    const mainDataStr = localStorage.getItem('orgData_main') || localStorage.getItem('orgData')
    if (!mainDataStr) return
    
    try {
      const mainData: OrgData = JSON.parse(mainDataStr)
      const updatedCoordinators = mainData.coordinators.map(coord => 
        coord.id === coordinatorId 
          ? { ...coord, linkedSchemaId: schemaId, hasDetailPage: true }
          : coord
      )
      
      const updatedMainData = { ...mainData, coordinators: updatedCoordinators }
      localStorage.setItem('orgData_main', JSON.stringify(updatedMainData))
      localStorage.setItem('orgData', JSON.stringify(updatedMainData))
      
      // Bağlantı haritasını güncelle
      const linkMap = JSON.parse(localStorage.getItem('schemaLinkMap') || '{}')
      linkMap[schemaId] = coordinatorId
      localStorage.setItem('schemaLinkMap', JSON.stringify(linkMap))
    } catch (e) {
      console.error('Failed to link schema:', e)
    }
  }

  // Şema bağlantısını kaldır
  const unlinkSchemaFromCoordinator = (coordinatorId: string) => {
    setData(prev => ({
      ...prev,
      coordinators: prev.coordinators.map(coord =>
        coord.id === coordinatorId
          ? { ...coord, linkedSchemaId: undefined }
          : coord
      )
    }))
    setTimeout(saveData, 0)
  }

  // Bağlı şema verisini al
  const getLinkedSchemaData = (schemaId: string): OrgData | null => {
    const dataStr = localStorage.getItem(`orgData_${schemaId}`)
    if (!dataStr) return null
    try {
      return JSON.parse(dataStr)
    } catch {
      return null
    }
  }

  return (
    <OrgDataContext.Provider value={{
      data,
      updateCoordinator,
      addSubUnit,
      addDeputy,
      addResponsibility,
      addPerson,
      updatePerson,
      deleteSubUnit,
      deleteDeputy,
      deleteCoordinator,
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
