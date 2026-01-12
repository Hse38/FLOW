'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import {
  database,
  ref,
  onValue,
  set,
  get
} from '@/lib/firebase'
import orgJsonData from '@/data/org.json'

// Development'ta localStorage, production'da Firebase kullan
// Environment variable ile manuel kontrol: NEXT_PUBLIC_USE_LOCAL_ONLY=true (localStorage zorla kullan)
// Production'da (Vercel) otomatik Firebase kullanılır
const getUseLocalOnly = () => {
  if (typeof window === 'undefined') {
    // SSR: Sadece env variable kontrolü - production'da her zaman Firebase
    const useLocal = process.env.NEXT_PUBLIC_USE_LOCAL_ONLY === 'true'
    return useLocal
  }
  
  // Client-side: hostname kontrolü - localhost değilse her zaman Firebase kullan!
  const hostname = window.location.hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.')
  const forceLocal = process.env.NEXT_PUBLIC_USE_LOCAL_ONLY === 'true'
  
  // ÖNEMLİ: Production'da (localhost değilse) her zaman Firebase kullan!
  // Sadece localhost'ta ve forceLocal true ise localStorage kullan
  const useLocal = forceLocal || isLocalhost
  
  // Debug log - Production'da özellikle önemli
  const isProduction = !isLocalhost
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🔍 DATA STORAGE MODE DETECTION')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  📍 Hostname:', hostname)
  console.log('  🔧 USE_LOCAL_ONLY:', useLocal)
  console.log('  💾 Storage Mode:', useLocal ? '⚠️ localStorage' : '✅ Firebase')
  console.log('  🌐 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT')
  console.log('  🎯 Force Local:', forceLocal)
  console.log('  ⚙️  NEXT_PUBLIC_USE_LOCAL_ONLY:', process.env.NEXT_PUBLIC_USE_LOCAL_ONLY || '(not set)')
  console.log('═══════════════════════════════════════════════════════════')
  
  if (isProduction && !useLocal) {
    console.log('✅✅✅ PRODUCTION MODU: FIREBASE AKTİF! ✅✅✅')
    console.log('   Veriler Firebase\'den yüklenecek')
  } else if (useLocal) {
    console.log('⚠️ LOCAL MODU: localStorage kullanılıyor')
    console.log('   Veriler localStorage\'dan yüklenecek')
  }
  
  return useLocal
}

const USE_LOCAL_ONLY = getUseLocalOnly()

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
  photoData?: string  // Base64 encoded photo
  color?: string // Kart rengi (blue, red, green, purple, orange, pink)
  university?: string // Üniversite
  department?: string // Bölüm
  jobDescription?: string // İş Kalemleri / Görev Tanımı
}

export interface SubUnit {
  id: string
  title: string
  people: Person[]
  responsibilities: string[]
  description?: string  // Birim açıklaması
  normKadro?: number  // Olması gereken kişi sayısı
  deputyId?: string  // Hangi koordinatör yardımcısına bağlı (opsiyonel)
}

export interface Deputy {
  id: string
  name: string
  title: string
  responsibilities: string[]
  color?: string
}

export interface Coordinator {
  id: string
  title: string
  description: string
  responsibilities: string[]
  position: { x: number; y: number }
  parent: string
  hasDetailPage?: boolean
  coordinator?: { name: string; title: string; color?: string }
  deputies: Deputy[]
  subUnits: SubUnit[]
  people?: Person[]
  linkedSchemaId?: string
  normKadro?: number  // Koordinatörlük düzeyinde olması gereken kişi sayısı
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

export interface CityPersonnel {
  id: string
  city: string
  ilSorumlusu?: Person  // İl Sorumlusu
  deneyapSorumlusu?: Person  // Deneyap Sorumlusu
  people?: Person[]  // Diğer personel (opsiyonel, geriye uyumluluk için)
}

export interface RegionPersonnel {
  id: string
  region: string  // Marmara, İç Anadolu, Ege, vb.
  bolgeSorumlusu?: Person  // Bölge Sorumlusu
}

export interface OrgData {
  management: Management[]
  executives: Executive[]
  mainCoordinators: MainCoordinator[]
  coordinators: Coordinator[]
  cityPersonnel?: CityPersonnel[]  // Toplumsal Çalışmalar şehir bazlı personel
  regionPersonnel?: RegionPersonnel[]  // Bölge sorumluları
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
  deletePerson: (coordinatorId: string, subUnitId: string, personId: string) => void
  movePerson: (fromCoordinatorId: string, fromSubUnitId: string, personId: string, toCoordinatorId: string, toSubUnitId: string) => void // Personel taşıma (birim değiştirme)
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
  updateSubUnit: (coordinatorId: string, subUnitId: string, updates: Partial<SubUnit>) => void
  // Şehir personel fonksiyonları
  addCityPerson: (city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', person: Omit<Person, 'id'>) => void
  updateCityPerson: (city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', personId: string, updates: Partial<Person>) => void
  deleteCityPerson: (city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', personId: string) => void
  getCityPersonnel: () => CityPersonnel[]
  // Bölge personel fonksiyonları
  addRegionPerson: (region: string, person: Omit<Person, 'id'>) => void
  updateRegionPerson: (region: string, personId: string, updates: Partial<Person>) => void
  deleteRegionPerson: (region: string, personId: string) => void
  getRegionPersonnel: () => RegionPersonnel[]
  getAllPersonnel: () => Array<{
    person: Person
    type: 'coordinator' | 'deputy' | 'subunit-person' | 'city-person'
    coordinatorId?: string
    coordinatorTitle?: string
    subUnitId?: string
    subUnitTitle?: string
    city?: string
    role?: 'ilSorumlusu' | 'deneyapSorumlusu' // Şehir personeli için role
  }> // Tüm personeli getir (koordinatör, deputy, alt birim personeli, şehir personeli)
  resetToEmpty: () => void
  restoreData: (data: OrgData) => void // Undo/Redo için
  saveData: () => void
  loadData: () => void
  syncLocalToFirebase: () => Promise<{ success: boolean; projectId: string } | undefined> // Lokaldeki verileri Firebase'e yükle
  syncInitialDataToFirebase: () => Promise<{ success: boolean; projectId: string } | undefined> // InitialData'yı direkt Firebase'e yükle
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
const initialDataLegacy: OrgData = {
  management: [
    {
      id: "selcuk-bayraktar",
      name: "Selçuk Bayraktar",
      title: "Yönetim Kurulu Başkanı",
      type: "chairman",
      position: { x: 700, y: 50 }
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
      id: "kure",
      name: "Küre",
      title: "Koordinatörlük",
      type: "special",
      position: { x: 1350, y: 50 },
      parent: "selcuk-bayraktar"
    },
    {
      id: "elvan-kuzucu",
      name: "Elvan Kuzucu Hıdır",
      title: "Genel Müdür Yardımcısı",
      type: "executive",
      position: { x: 350, y: 180 },
      parent: "selcuk-bayraktar"
    },
    {
      id: "muhammet-saymaz",
      name: "Muhammet Saymaz",
      title: "Genel Müdür Yardımcısı",
      type: "executive",
      position: { x: 1050, y: 180 },
      parent: "selcuk-bayraktar"
    }
  ],
  mainCoordinators: [
    {
      id: "t3-vakfi-koordinatorlukleri",
      title: "T3 Vakfı Koordinatörlükleri",
      description: "T3 Vakfı bünyesindeki tüm koordinatörlükler",
      type: "main-coordinator",
      position: { x: 200, y: 320 },
      parent: "elvan-kuzucu"
    },
    {
      id: "teknofest-koordinatorlukleri",
      title: "Teknofest Koordinatörlükleri",
      description: "Teknofest etkinlikleri koordinatörlükleri",
      type: "main-coordinator",
      position: { x: 1200, y: 320 },
      parent: "muhammet-saymaz"
    },
    {
      id: "t3-teknofest-koordinatorlukleri",
      title: "T3 Vakfı / Teknofest Koordinatörlükleri",
      description: "Her iki yapıya da hizmet veren koordinatörlükler",
      type: "main-coordinator",
      position: { x: 700, y: 900 },
      parent: null
    }
  ],
  coordinators: [
    {
      id: "satin-alma",
      title: "Satın Alma Birimi",
      description: "Satın alma ve tedarik işlemleri",
      responsibilities: ["Tedarikçi yönetimi", "Satın alma süreçleri", "Fiyat müzakereleri", "Sözleşme yönetimi"],
      position: { x: -100, y: 480 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "bursiyer",
      title: "Bursiyer Koordinatörlüğü",
      description: "Burs programları yönetimi",
      responsibilities: ["Bursiyer Seçme ve Yerleştirme Süreçleri", "Bursiyer Dokümantasyon ve Süreç Takibi", "Operasyonel Bursiyer Yönetimi", "Etkinlik, Ödeme ve Destek Süreçleri"],
      position: { x: 100, y: 480 },
      parent: "t3-vakfi-koordinatorlukleri",
      hasDetailPage: true,
      coordinator: {
        name: "Erkut Kalakavan",
        title: "Bursiyer Koordinatörü"
      },
      deputies: [],
      people: [
        {
          id: "burs1",
          name: "Muhammet Ali Demir",
          jobDescription: "Bursiyer Seçme ve Yerleştirme Süreçleri\nBursiyer Dokümantasyon ve Süreç Takibi\nOperasyonel Bursiyer Yönetimi\nEtkinlik, Ödeme ve Destek Süreçleri"
        },
        {
          id: "burs2",
          name: "Nur Turhal",
          jobDescription: "Bursiyer Seçme ve Yerleştirme Süreçleri\nBursiyer Dokümantasyon ve Süreç Takibi\nOperasyonel Bursiyer Yönetimi\nEtkinlik, Ödeme ve Destek Süreçleri"
        }
      ],
      subUnits: []
    },
    {
      id: "mimari-tasarim",
      title: "Mimari Tasarım ve Planlama Koordinatörlüğü",
      description: "Mekan tasarımı ve planlama",
      responsibilities: ["Mekan tasarımları", "Proje planlaması", "İnşaat koordinasyonu", "Teknik çizimler"],
      position: { x: 300, y: 480 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "insan-kaynaklari",
      title: "İnsan Kaynakları Koordinatörlüğü",
      description: "İnsan kaynakları yönetimi",
      responsibilities: ["İşe alım süreçleri", "Performans yönetimi", "Eğitim ve gelişim", "Özlük işleri"],
      position: { x: 500, y: 480 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "t3-girisim-merkezi",
      title: "T3 Girişim Merkezi Koordinatörlüğü",
      description: "Girişimcilik ve inovasyon merkezi yönetimi",
      responsibilities: ["Girişimcilik programları yönetimi", "Startup destekleme", "Mentor ağı koordinasyonu", "Demo Day organizasyonları"],
      position: { x: -100, y: 620 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "egitim-arge",
      title: "Eğitim ve AR-GE Koordinatörlüğü",
      description: "Eğitim programları ve araştırma geliştirme",
      responsibilities: ["Eğitim müfredatı geliştirme", "AR-GE projeleri yönetimi", "Akademik işbirlikleri", "İnovasyon araştırmaları"],
      position: { x: 100, y: 620 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "muhasebe",
      title: "Muhasebe Birimi",
      description: "Mali işler ve muhasebe",
      responsibilities: ["Muhasebe kayıtları", "Mali raporlama", "Bütçe takibi", "Vergi işlemleri"],
      position: { x: 300, y: 620 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "bilisim-teknolojileri",
      title: "Bilişim Teknolojileri Koordinatörlüğü",
      description: "IT altyapı ve yazılım yönetimi",
      responsibilities: ["IT altyapı yönetimi", "Yazılım geliştirme", "Siber güvenlik", "Teknik destek"],
      position: { x: 500, y: 620 },
      parent: "t3-vakfi-koordinatorlukleri",
      hasDetailPage: true,
      deputies: [],
      people: [
        {
          id: "bt1",
          name: "Hüseyin Ocak",
          jobDescription: "Yazılım Geliştirme ve Teknik Bakım\nDijital Altyapı ve Sistem Sürekliliği\nProje Yönetimi ve Teknik Koordinasyon\nGüvenlik, Sistem ve Performans İzleme"
        },
        {
          id: "bt2",
          name: "Hakan Sandıkçı",
          jobDescription: "Yazılım Geliştirme ve Teknik Bakım\nDijital Altyapı ve Sistem Sürekliliği\nProje Yönetimi ve Teknik Koordinasyon\nGüvenlik, Sistem ve Performans İzleme"
        },
        {
          id: "bt3",
          name: "Büşra Köseoğlu Dağgez",
          jobDescription: "Yazılım Geliştirme ve Teknik Bakım\nDijital Altyapı ve Sistem Sürekliliği\nProje Yönetimi ve Teknik Koordinasyon\nGüvenlik, Sistem ve Performans İzleme"
        },
        {
          id: "bt4",
          name: "Merve Camadan",
          jobDescription: "Yazılım Geliştirme ve Teknik Bakım\nDijital Altyapı ve Sistem Sürekliliği\nProje Yönetimi ve Teknik Koordinasyon\nGüvenlik, Sistem ve Performans İzleme"
        },
        {
          id: "bt5",
          name: "Furkan Ayrı",
          jobDescription: "Yazılım Geliştirme ve Teknik Bakım\nDijital Altyapı ve Sistem Sürekliliği\nProje Yönetimi ve Teknik Koordinasyon\nGüvenlik, Sistem ve Performans İzleme"
        }
      ],
      subUnits: []
    },
    {
      id: "teknofest-yarismalar",
      title: "Teknofest Yarışmalar Koordinatörlüğü",
      description: "Teknoloji yarışmaları yönetimi",
      responsibilities: ["Yarışma organizasyonu", "Jüri koordinasyonu", "Başvuru yönetimi", "Ödül törenleri"],
      position: { x: -100, y: 760 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "deneyap-koordinatorlugu",
      title: "DENEYAP Koordinatörlüğü",
      description: "DENEYAP Teknoloji Atölyeleri yönetimi",
      responsibilities: ["Eğitim, satış ve operasyon süreçlerinin koordinasyonu", "Komisyonlar arası çalışma ve karar süreçlerinin yönetimi", "Okul yönetimi ve ana kural/planlama sorumlulukları"],
      position: { x: 100, y: 760 },
      parent: "t3-vakfi-koordinatorlukleri",
      hasDetailPage: true,
      coordinator: {
        name: "Barış Anıl",
        title: "DENEYAP Koordinatörü"
      },
      deputies: [
        {
          id: "gamze-cetisyer",
          name: "Gamze Çetişyer",
          title: "Koordinatör Yardımcısı",
          responsibilities: ["Eğitim ve Tedarik Süreçleri"]
        },
        {
          id: "oya-tofekci",
          name: "Oya Zeynep Tofekçi",
          title: "Koordinatör Yardımcısı",
          responsibilities: ["DENEYAP lojistik ve medya yönetimi"]
        }
      ],
      subUnits: [
        {
          id: "egitim-programlari",
          title: "Eğitim Programları Koordinasyonu",
          people: [{ id: "d1", name: "Kenan Yıldız", jobDescription: "Eğitim müfredatı ve yarış beceri dörtimi\nEğitim ve beceri dönütümü kontrolü\nEğitim personel ve işletim koordinasyonu" }],
          responsibilities: ["Eğitim müfredatı yönetimi", "Yarış beceri dörtimi"]
        },
        {
          id: "egitimci-yonetici",
          title: "Eğitimci, Yönetici ve Barikat Koordinasyonu",
          people: [{ id: "d2", name: "Kubilay Kulibeş", jobDescription: "Eğitimci ve yönetici koordinasyonu\nBarikat süreçlerinin yönetimi" }],
          responsibilities: ["Eğitimci koordinasyonu", "Barikat süreçleri"]
        },
        {
          id: "egitmen-komisyonu",
          title: "Eğitmen Komisyonu",
          people: [
            { id: "d3", name: "Sümeyye Demir", jobDescription: "Eğitmen işlemleri\nEğitmen yönlendirme ve planlama\nEğitmen performans ve değerlendirme süreçleri" },
            { id: "d4", name: "Yeşim Yannaz", jobDescription: "Eğitmen işlemleri\nEğitmen yönlendirme ve planlama\nEğitmen performans ve değerlendirme süreçleri" }
          ],
          responsibilities: ["Eğitmen yönlendirme", "Performans değerlendirme"]
        },
        {
          id: "satis-ideri-komisyonu",
          title: "Satış-İderi Komisyonu",
          people: [
            { id: "d5", name: "Muhammet Enes Köroğlu", jobDescription: "Satış işlemleri\nİderi süreç yönetimi" },
            { id: "d6", name: "Hatice Milas", jobDescription: "Satış işlemleri\nİderi süreç yönetimi" },
            { id: "d7", name: "Aleli", jobDescription: "Satış işlemleri\nİderi süreç yönetimi" }
          ],
          responsibilities: ["Satış işlemleri", "İderi süreç yönetimi"]
        },
        {
          id: "tedarik-komisyonu",
          title: "Tedarik Komisyonu",
          people: [{ id: "d8", name: "Haluk Miraç", jobDescription: "Tedarik süreçlerinin yönetimi\nMalzeme takibi" }],
          responsibilities: ["Tedarik süreçleri", "Malzeme takibi"]
        },
        {
          id: "ogrenci-komisyonu",
          title: "Öğrenci Komisyonu",
          people: [{ id: "d9", name: "Yusuf Şakar", jobDescription: "Öğrenci seçme ve kayıt süreçleri\nOKS kayıt güncellemeleri ve koordinasyonu" }],
          responsibilities: ["Öğrenci seçme ve kayıt", "OKS koordinasyonu"]
        }
      ]
    },
    {
      id: "deneyap-kart",
      title: "DENEYAP Kart Birimi",
      description: "DENEYAP Kart üretim ve dağıtım",
      responsibilities: ["Kart üretimi koordinasyonu", "Dağıtım planlaması", "Stok yönetimi", "Kalite kontrol"],
      position: { x: 300, y: 760 },
      parent: "t3-vakfi-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-ulasim",
      title: "Teknofest Ulaşım Koordinatörlüğü",
      description: "Teknofest etkinlik ulaşım lojistiği",
      responsibilities: ["Ulaşım planlaması", "Araç koordinasyonu", "Katılımcı transferleri", "Lojistik yönetimi"],
      position: { x: 1000, y: 480 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-satis-pazarlama",
      title: "Teknofest Satış ve Pazarlama Koordinatörlüğü",
      description: "Pazarlama ve sponsorluk yönetimi",
      responsibilities: ["Sponsorluk yönetimi", "Pazarlama stratejisi", "Marka yönetimi", "Satış operasyonları"],
      position: { x: 1200, y: 480 },
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
      position: { x: 1050, y: 620 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "teknofest-operasyon",
      title: "Teknofest Operasyon Koordinatörlüğü",
      description: "Etkinlik operasyonları yönetimi",
      responsibilities: ["Saha operasyonları", "Güvenlik koordinasyonu", "Teknik altyapı", "Acil durum yönetimi"],
      position: { x: 1250, y: 620 },
      parent: "teknofest-koordinatorlukleri",
      deputies: [],
      subUnits: []
    },
    {
      id: "idari-isler",
      title: "İdari İşler Koordinatörlüğü",
      description: "İdari işler ve genel hizmetler",
      responsibilities: ["Genel idari işler", "Ofis yönetimi", "Tedarik süreçleri", "Tesis yönetimi"],
      position: { x: 500, y: 1050 },
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
      position: { x: 900, y: 1050 },
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

// Lokal org.json'dan oku
const initialDataRaw: OrgData = orgJsonData as unknown as OrgData

// Duplicate ID'leri temizle - utility function (component dışında, stable referans için)
function cleanDuplicateIds(orgData: OrgData): OrgData {
  const cleaned = { ...orgData }
  
  // Coordinators'daki duplicate ID'leri temizle
  const seenCoordIds = new Set<string>()
  const uniqueCoordinators: Coordinator[] = []
  let duplicateCount = 0
  
  cleaned.coordinators.forEach((coord, index) => {
    if (seenCoordIds.has(coord.id)) {
      // Duplicate ID bulundu, yeni unique ID oluştur
      const newId = `coord-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
      console.warn(`⚠️ Duplicate coordinator ID found: "${coord.id}" -> renamed to "${newId}"`)
      uniqueCoordinators.push({ ...coord, id: newId })
      duplicateCount++
    } else {
      seenCoordIds.add(coord.id)
      uniqueCoordinators.push(coord)
    }
  })
  
  if (duplicateCount > 0) {
    console.warn(`⚠️ Cleaned ${duplicateCount} duplicate coordinator ID(s)`)
    cleaned.coordinators = uniqueCoordinators
  }
  
  // Main coordinators'daki duplicate ID'leri temizle
  const seenMainCoordIds = new Set<string>()
  const uniqueMainCoordinators: MainCoordinator[] = []
  let duplicateMainCount = 0
  
  cleaned.mainCoordinators.forEach((coord, index) => {
    if (seenMainCoordIds.has(coord.id)) {
      const newId = `maincoord-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
      console.warn(`⚠️ Duplicate main coordinator ID found: "${coord.id}" -> renamed to "${newId}"`)
      uniqueMainCoordinators.push({ ...coord, id: newId })
      duplicateMainCount++
    } else {
      seenMainCoordIds.add(coord.id)
      uniqueMainCoordinators.push(coord)
    }
  })
  
  if (duplicateMainCount > 0) {
    console.warn(`⚠️ Cleaned ${duplicateMainCount} duplicate main coordinator ID(s)`)
    cleaned.mainCoordinators = uniqueMainCoordinators
  }
  
  return cleaned
}

const initialData = cleanDuplicateIds(initialDataRaw)

export function OrgDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OrgData>(initialData)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string>('main')
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [customConnections, setCustomConnections] = useState<Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Generate unique ID - counter ile daha unique hale getirildi
  const idCounterRef = useRef(0)
  const generateId = useCallback(() => {
    idCounterRef.current++
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const counter = idCounterRef.current.toString(36)
    return `id-${timestamp}-${counter}-${random}`
  }, [])

  // Firebase'den verileri dinle - gerçek zamanlı senkronizasyon
  useEffect(() => {
    if (USE_LOCAL_ONLY) {
      setIsLoading(false)
      setProjects([])
      setActiveProjectId('main')
      setIsLocked(false)
      return
    }
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
    if (USE_LOCAL_ONLY) {
      // localStorage'dan verileri yükle (activeProjectId'ye göre)
      try {
        const projectId = activeProjectId || 'main'
        const savedData = localStorage.getItem(`orgData_${projectId}`)
        const savedPositions = localStorage.getItem(`orgPositions_${projectId}`)
        const savedConnections = localStorage.getItem(`orgConnections_${projectId}`)
        const savedLocked = localStorage.getItem('orgLocked')

        if (savedData) {
          const parsedData = JSON.parse(savedData)
          // Duplicate ID'leri temizle
          const cleanedData = cleanDuplicateIds(parsedData)
          // Eğer temizleme yapıldıysa localStorage'a kaydet
          if (cleanedData !== parsedData) {
            localStorage.setItem(`orgData_${projectId}`, JSON.stringify(cleanedData))
          }
          setData(cleanedData)
          } else {
            // İlk yüklemede veya yeni projede initialData'yı kullan
            if (projectId === 'main') {
              const cleanedInitial = cleanDuplicateIds(initialData)
              localStorage.setItem(`orgData_${projectId}`, JSON.stringify(cleanedInitial))
              setData(cleanedInitial)
            } else {
              // Yeni proje için boş veri
              const emptyData: OrgData = {
                management: [],
                executives: [],
                mainCoordinators: [],
                coordinators: []
              }
              localStorage.setItem(`orgData_${projectId}`, JSON.stringify(emptyData))
              setData(cleanDuplicateIds(emptyData))
            }
          }

        if (savedPositions) {
          setPositions(JSON.parse(savedPositions))
        } else {
          setPositions({})
        }

        if (savedConnections) {
          setCustomConnections(JSON.parse(savedConnections))
        } else {
          setCustomConnections([])
        }

        if (savedLocked !== null) {
          setIsLocked(savedLocked === 'true')
        }
      } catch (error) {
        console.error('localStorage yükleme hatası:', error)
        setData(initialData)
      }

      setIsLoading(false)
      return
    }
    
    if (!activeProjectId) {
      setIsLoading(false)
      return
    }

    // Org data dinle - Production'da Firebase'den otomatik yükle (cleanDuplicateIds fonksiyonu component seviyesinde tanımlı)
    const orgDataRef = ref(database, `orgData/${activeProjectId}`)
    console.log('🔍 [PRODUCTION] Firebase\'den veri dinleniyor:', `orgData/${activeProjectId}`)
    const unsubData = onValue(orgDataRef, (snapshot) => {
      const val = snapshot.val()
      console.log('📦 [PRODUCTION] Firebase snapshot alındı:', {
        exists: snapshot.exists(),
        hasValue: !!val,
        coordinatorsType: val?.coordinators ? typeof val.coordinators : 'undefined',
        coordinatorsIsArray: Array.isArray(val?.coordinators),
        coordinatorsLength: val?.coordinators?.length,
        coordinatorsKeys: val?.coordinators ? Object.keys(val.coordinators) : []
      })
      
      if (val) {
        // Veri yapısını normalize et - coordinators array veya object olabilir
        let normalizedVal = { ...val }
        
        // Eğer coordinators object ise array'e çevir
        if (val.coordinators && !Array.isArray(val.coordinators) && typeof val.coordinators === 'object') {
          console.log('🔄 Coordinators object formatında, array\'e çevriliyor...')
          normalizedVal.coordinators = Object.values(val.coordinators)
        }
        
        // Coordinators array'i yoksa boş array olarak ayarla
        if (!normalizedVal.coordinators) {
          normalizedVal.coordinators = []
        }
        
        // Diğer array'ler için de aynı kontrolü yap
        if (!normalizedVal.management) normalizedVal.management = []
        if (!normalizedVal.executives) normalizedVal.executives = []
        if (!normalizedVal.mainCoordinators) normalizedVal.mainCoordinators = []
        
        console.log('✅✅✅ [PRODUCTION] Firebase\'den veri yüklendi! ✅✅✅')
        console.log('  - Project ID:', activeProjectId)
        console.log('  - Management:', normalizedVal.management?.length || 0)
        console.log('  - Executives:', normalizedVal.executives?.length || 0)
        console.log('  - Main Coordinators:', normalizedVal.mainCoordinators?.length || 0)
        console.log('  - Coordinators:', normalizedVal.coordinators?.length || 0)
        
        // Duplicate ID'leri temizle
        const cleanedVal = cleanDuplicateIds(normalizedVal)
        
        // Eğer temizleme yapıldıysa Firebase'e kaydet
        if (JSON.stringify(cleanedVal) !== JSON.stringify(normalizedVal)) {
          set(ref(database, `orgData/${activeProjectId}`), cleanedVal).then(() => {
            console.log('✅ Duplicate ID\'ler temizlendi ve Firebase\'e kaydedildi')
          })
        }
        
        // Detaylı log
        if (cleanedVal.coordinators && cleanedVal.coordinators.length > 0) {
          cleanedVal.coordinators.forEach((coord: any, idx: number) => {
            console.log(`    ${idx + 1}. ${coord.title || coord.id || 'İsimsiz'}`)
            if (coord.deputies && coord.deputies.length > 0) {
              console.log(`       - Deputies: ${coord.deputies.length}`)
            }
            if (coord.subUnits && coord.subUnits.length > 0) {
              console.log(`       - SubUnits: ${coord.subUnits.length}`)
            }
          })
        } else {
          console.log('  ⚠️ Coordinators array boş veya yok')
        }
        
        setData(cleanedVal)
      } else {
        // Firebase'de veri yoksa - boş veri göster (üzerine yazma!)
        console.log('⚠️⚠️⚠️ [PRODUCTION] Firebase\'de veri yok! ⚠️⚠️⚠️')
        console.log('  - Project ID:', activeProjectId)
        console.log('  - Path:', `orgData/${activeProjectId}`)
        console.log('  - Boş veri gösteriliyor.')
        console.log('  - ÇÖZÜM: Lokalde "Firebase\'e Yükle" butonuna basın!')
        // Sadece boş veri göster, Firebase'e yazma (kullanıcının verileri üzerine yazılmasın)
        const emptyData: OrgData = { management: [], executives: [], mainCoordinators: [], coordinators: [] }
        setData(cleanDuplicateIds(emptyData))
      }
      setIsLoading(false)
    }, (error) => {
      console.error('❌❌❌ [PRODUCTION] Firebase veri okuma hatası:', error)
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
  }, [activeProjectId]) // activeProjectId değiştiğinde yeniden yükle (cleanDuplicateIds component dışında tanımlı, stable referans)

  // Firebase'e veri kaydet (veya localStorage)
  const saveToFirebase = useCallback((newData: OrgData) => {
    try {
      if (USE_LOCAL_ONLY) {
        setData(newData)
        // localStorage'a kaydet (activeProjectId'ye göre)
        try {
          const projectId = activeProjectId || 'main'
          localStorage.setItem(`orgData_${projectId}`, JSON.stringify(newData))
        } catch (error) {
          console.error('localStorage kaydetme hatası:', error)
          throw error
        }
        return
      }
      if (activeProjectId) {
        set(ref(database, `orgData/${activeProjectId}`), newData).catch((error) => {
          console.error('❌ Firebase kaydetme hatası:', error)
          console.error('Hata detayları:', {
            projectId: activeProjectId,
            error: error.message || String(error),
            code: error.code || undefined
          })
          // Hata olsa bile state'i güncelle (offline mode için)
          setData(newData)
        })
      }
    } catch (error) {
      console.error('❌ saveToFirebase genel hatası:', error)
      // Hata olsa bile state'i güncelle
      setData(newData)
    }
  }, [activeProjectId])

  // Pozisyonları kaydet
  const updatePositions = useCallback((newPositions: Record<string, { x: number; y: number }>) => {
    if (USE_LOCAL_ONLY) {
      setPositions(newPositions)
      // localStorage'a kaydet (activeProjectId'ye göre)
      try {
        const projectId = activeProjectId || 'main'
        localStorage.setItem(`orgPositions_${projectId}`, JSON.stringify(newPositions))
      } catch (error) {
        console.error('localStorage pozisyon kaydetme hatası:', error)
      }
      return
    }
    if (activeProjectId) {
      set(ref(database, `positions/${activeProjectId}`), newPositions)
    }
  }, [activeProjectId])

  // Bağlantı ekle
  const addConnection = useCallback((connection: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => {
    const newConnections = [...customConnections, connection]
    if (USE_LOCAL_ONLY) {
      setCustomConnections(newConnections)
      // localStorage'a kaydet (activeProjectId'ye göre)
      try {
        const projectId = activeProjectId || 'main'
        localStorage.setItem(`orgConnections_${projectId}`, JSON.stringify(newConnections))
      } catch (error) {
        console.error('localStorage bağlantı kaydetme hatası:', error)
      }
      return
    }
    if (activeProjectId) {
      set(ref(database, `connections/${activeProjectId}`), newConnections)
    }
  }, [activeProjectId, customConnections])

  // Bağlantı kaldır
  const removeConnection = useCallback((source: string, target: string) => {
    const newConnections = customConnections.filter(c => !(c.source === source && c.target === target))
    if (USE_LOCAL_ONLY) {
      setCustomConnections(newConnections)
      // localStorage'a kaydet (activeProjectId'ye göre)
      try {
        const projectId = activeProjectId || 'main'
        localStorage.setItem(`orgConnections_${projectId}`, JSON.stringify(newConnections))
      } catch (error) {
        console.error('localStorage bağlantı silme hatası:', error)
      }
      return
    }
    if (activeProjectId) {
      set(ref(database, `connections/${activeProjectId}`), newConnections)
    }
  }, [activeProjectId, customConnections])

  // Kilit durumunu değiştir
  const setLocked = useCallback((locked: boolean) => {
    if (USE_LOCAL_ONLY) {
      setIsLocked(locked)
      // localStorage'a kaydet
      try {
        localStorage.setItem('orgLocked', locked.toString())
      } catch (error) {
        console.error('localStorage kilit durumu kaydetme hatası:', error)
      }
      return
    }
    set(ref(database, 'settings/locked'), locked)
  }, [])

  // Aktif projeyi değiştir
  const setActiveProject = useCallback((projectId: string) => {
    if (USE_LOCAL_ONLY) {
      setActiveProjectId(projectId)
      return
    }
    set(ref(database, 'settings/activeProjectId'), projectId)
  }, [])

  // Yeni proje oluştur
  const createProject = useCallback((name: string, isMain?: boolean) => {
    if (USE_LOCAL_ONLY) return
    const id = isMain ? 'main' : generateId()
    const project: Project = { id, name, createdAt: Date.now(), isMain }
    set(ref(database, `projects/${id}`), project)
    setActiveProject(id)
  }, [generateId, setActiveProject])

  // Proje sil
  const deleteProject = useCallback((projectId: string) => {
    if (USE_LOCAL_ONLY) return
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
  const loadData = useCallback(async () => {
    if (USE_LOCAL_ONLY) {
      console.log('⚠️ localStorage modu aktif, Firebase\'den yükleme yapılamaz')
      return
    }
    
    const projectId = activeProjectId || 'main'
    console.log('📥 Firebase\'den veriler yükleniyor...')
    console.log('  - Project ID:', projectId)
    
    try {
      // Firebase'den verileri çek
      const [dataSnapshot, positionsSnapshot, connectionsSnapshot] = await Promise.all([
        get(ref(database, `orgData/${projectId}`)),
        get(ref(database, `positions/${projectId}`)),
        get(ref(database, `connections/${projectId}`))
      ])
      
      // Verileri yükle
      if (dataSnapshot.exists()) {
        let firebaseData = dataSnapshot.val()
        console.log('📦 Firebase snapshot alındı:', {
          coordinatorsType: firebaseData?.coordinators ? typeof firebaseData.coordinators : 'undefined',
          coordinatorsIsArray: Array.isArray(firebaseData?.coordinators),
          coordinatorsLength: firebaseData?.coordinators?.length,
        })
        
        // Veri yapısını normalize et - coordinators array veya object olabilir
        if (firebaseData.coordinators && !Array.isArray(firebaseData.coordinators) && typeof firebaseData.coordinators === 'object') {
          console.log('🔄 Coordinators object formatında, array\'e çevriliyor...')
          firebaseData = {
            ...firebaseData,
            coordinators: Object.values(firebaseData.coordinators)
          }
        }
        
        // Array'leri normalize et
        if (!firebaseData.coordinators) firebaseData.coordinators = []
        if (!firebaseData.management) firebaseData.management = []
        if (!firebaseData.executives) firebaseData.executives = []
        if (!firebaseData.mainCoordinators) firebaseData.mainCoordinators = []
        
        console.log('✅ Firebase\'den orgData yüklendi')
        console.log('  - Management:', firebaseData.management?.length || 0)
        console.log('  - Executives:', firebaseData.executives?.length || 0)
        console.log('  - Main Coordinators:', firebaseData.mainCoordinators?.length || 0)
        console.log('  - Coordinators:', firebaseData.coordinators?.length || 0)
        
        const cleanedData = cleanDuplicateIds(firebaseData)
        setData(cleanedData)
        
        // localStorage'a da kaydet (yedekleme için)
        try {
          localStorage.setItem(`orgData_${projectId}`, JSON.stringify(cleanedData))
        } catch (e) {
          console.warn('localStorage kaydetme hatası:', e)
        }
      } else {
        console.warn('⚠️ Firebase\'de veri bulunamadı')
      }
      
      if (positionsSnapshot.exists()) {
        const firebasePositions = positionsSnapshot.val()
        console.log('✅ Firebase\'den positions yüklendi')
        setPositions(firebasePositions)
        
        // localStorage'a da kaydet
        try {
          localStorage.setItem(`orgPositions_${projectId}`, JSON.stringify(firebasePositions))
        } catch (e) {
          console.warn('localStorage kaydetme hatası:', e)
        }
      }
      
      if (connectionsSnapshot.exists()) {
        const firebaseConnections = connectionsSnapshot.val()
        console.log('✅ Firebase\'den connections yüklendi')
        setCustomConnections(firebaseConnections)
        
        // localStorage'a da kaydet
        try {
          localStorage.setItem(`orgConnections_${projectId}`, JSON.stringify(firebaseConnections))
        } catch (e) {
          console.warn('localStorage kaydetme hatası:', e)
        }
      }
      
      console.log('✅✅✅ Firebase verileri başarıyla yüklendi! ✅✅✅')
    } catch (error) {
      console.error('❌ Firebase\'den yükleme hatası:', error)
      throw error
    }
  }, [activeProjectId])

  // InitialData'yı direkt Firebase'e yükle
  const syncInitialDataToFirebase = useCallback(async () => {
    const projectId = activeProjectId || 'main'
    
    try {
      console.log('📤 InitialData Firebase\'e yükleniyor...')
      console.log('  - Project ID:', projectId)
      console.log('  - Coordinators:', initialData.coordinators?.length || 0)
      console.log('  - Executives:', initialData.executives?.length || 0)
      
      // InitialData'yı Firebase'e yaz
      await set(ref(database, `orgData/${projectId}`), initialData)
      console.log('  ✅ InitialData Firebase\'e yüklendi')
      
      // localStorage'a da kaydet
      try {
        localStorage.setItem(`orgData_${projectId}`, JSON.stringify(initialData))
      } catch (e) {
        console.warn('localStorage kaydetme hatası:', e)
      }
      
      return { success: true, projectId }
    } catch (error) {
      console.error('❌ InitialData Firebase yükleme hatası:', error)
      throw error
    }
  }, [activeProjectId])

  // Lokaldeki verileri Firebase'e sync et
  const syncLocalToFirebase = useCallback(async () => {
    const projectId = activeProjectId || 'main'
    
    try {
      // localStorage'dan verileri oku
      const localData = localStorage.getItem(`orgData_${projectId}`)
      const localPositions = localStorage.getItem(`orgPositions_${projectId}`)
      const localConnections = localStorage.getItem(`orgConnections_${projectId}`)
      const localLocked = localStorage.getItem('orgLocked')

      if (!localData) {
        const errorMsg = '⚠️ localStorage\'da veri bulunamadı! Önce lokalde bir şeyler ekleyin.'
        console.warn(errorMsg)
        throw new Error(errorMsg)
      }

      const parsedData = JSON.parse(localData)
      console.log('📤 Firebase\'e yükleniyor...')
      console.log('  - Project ID:', projectId)
      console.log('  - Coordinators:', parsedData.coordinators?.length || 0)
      
      // Firebase'e yaz - tüm verileri aynı anda yükle
      const promises = [
        set(ref(database, `orgData/${projectId}`), parsedData).then(() => console.log('  ✅ orgData yüklendi')),
      ]
      
      if (localPositions) {
        promises.push(
          set(ref(database, `positions/${projectId}`), JSON.parse(localPositions))
            .then(() => console.log('  ✅ positions yüklendi'))
        )
      }
      
      if (localConnections) {
        promises.push(
          set(ref(database, `connections/${projectId}`), JSON.parse(localConnections))
            .then(() => console.log('  ✅ connections yüklendi'))
        )
      }
      
      if (localLocked !== null) {
        promises.push(
          set(ref(database, 'settings/locked'), localLocked === 'true')
            .then(() => console.log('  ✅ locked durumu yüklendi'))
        )
      }
      
      promises.push(
        set(ref(database, 'settings/activeProjectId'), projectId)
          .then(() => console.log('  ✅ activeProjectId yüklendi'))
      )
      
      await Promise.all(promises)

      console.log('')
      console.log('✅✅✅ TÜM VERİLER FIREBASE\'E BAŞARIYLA YÜKLENDİ! ✅✅✅')
      console.log('📍 Project ID:', projectId)
      console.log('🌐 Canlıda (production) otomatik olarak Firebase\'den yüklenecek')
      console.log('💡 Production\'da Storage Mode: Firebase (USE_LOCAL_ONLY = false)')
      console.log('')
      
      // Firebase'den doğrulama oku
      try {
        const snapshot = await get(ref(database, `orgData/${projectId}`))
        if (snapshot.exists()) {
          const firebaseData = snapshot.val()
          console.log('✅ DOĞRULAMA: Firebase\'de veri mevcut!')
          console.log('  - Firebase\'deki coordinators:', firebaseData.coordinators?.length || 0)
          if (firebaseData.coordinators && firebaseData.coordinators.length > 0) {
            const firstCoord = firebaseData.coordinators[0]
            console.log('  - İlk coordinator:', firstCoord.title)
            if (firstCoord.deputies && firstCoord.deputies.length > 0) {
              console.log('    - Deputies:', firstCoord.deputies.length, '- İlk:', firstCoord.deputies[0].name)
            }
            if (firstCoord.subUnits && firstCoord.subUnits.length > 0) {
              console.log('    - SubUnits:', firstCoord.subUnits.length, '- İlk:', firstCoord.subUnits[0].title)
            }
          }
          console.log('')
          console.log('🎉 BAŞARILI! Canlıda bu veriler görünecek.')
        } else {
          console.warn('⚠️ DOĞRULAMA: Firebase\'de veri bulunamadı!')
        }
      } catch (verifyError) {
        console.warn('⚠️ Doğrulama hatası:', verifyError)
      }
      
      return { success: true, projectId }
    } catch (error) {
      console.error('❌ Firebase\'e yükleme hatası:', error)
      throw error
    }
  }, [activeProjectId])

  // Reset to empty canvas
  const resetToEmpty = useCallback(() => {
    const emptyData: OrgData = {
      management: [],
      executives: [],
      mainCoordinators: [],
      coordinators: []
    }
    setData(emptyData)
    if (!USE_LOCAL_ONLY) {
      saveToFirebase(emptyData)
    } else {
      saveToFirebase(emptyData) // localStorage'a kaydet
    }
  }, [saveToFirebase])

  // Restore data from snapshot (for Undo/Redo)
  const restoreData = useCallback((newData: OrgData) => {
    setData(newData)
    if (!USE_LOCAL_ONLY) {
      saveToFirebase(newData)
    } else {
      saveToFirebase(newData) // localStorage'a kaydet
    }
  }, [saveToFirebase])

  // Update coordinator
  const updateCoordinator = useCallback((id: string, updates: Partial<Coordinator>) => {
    if (!id || !updates) {
      console.error('❌ updateCoordinator: Geçersiz parametreler', { id, updates })
      return
    }
    
    setData(prev => {
      try {
        const coordinator = prev.coordinators.find(c => c.id === id)
        if (!coordinator) {
          console.error('❌ updateCoordinator: Koordinatör bulunamadı', { id })
          return prev
        }
        
        const newData = {
          ...prev,
          coordinators: prev.coordinators.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }
        saveToFirebase(newData)
        return newData
      } catch (error) {
        console.error('❌ updateCoordinator hatası:', error)
        return prev
      }
    })
  }, [saveToFirebase])

  // Add sub unit
  const addSubUnit = useCallback((coordinatorId: string, subUnit: Omit<SubUnit, 'id'>) => {
    if (!coordinatorId || !subUnit || !subUnit.title) {
      console.error('❌ addSubUnit: Geçersiz parametreler', { coordinatorId, subUnit })
      return
    }
    
    setData(prev => {
      try {
        // Duplicate kontrolü - aynı title'a sahip subunit var mı?
        const coordinator = prev.coordinators.find(c => c.id === coordinatorId)
        
        if (!coordinator) {
          console.error('❌ addSubUnit: Koordinatör bulunamadı', { coordinatorId })
          return prev
        }
        
        const existingSubUnit = coordinator?.subUnits?.find(su => su.title === subUnit.title)

        if (existingSubUnit) {
          // Zaten varsa, mevcut data'yı döndür (ekleme yapma)
          return prev
        }

        const newSubUnit: SubUnit = {
          ...subUnit,
          id: generateId(),
        }

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
      } catch (error) {
        console.error('❌ addSubUnit hatası:', error)
        return prev
      }
    })
  }, [generateId, saveToFirebase])

  // Add deputy
  const addDeputy = useCallback((coordinatorId: string, deputy: Omit<Deputy, 'id'>) => {
    if (!coordinatorId || !deputy || !deputy.name) {
      console.error('❌ addDeputy: Geçersiz parametreler', { coordinatorId, deputy })
      return
    }
    
    setData(prev => {
      try {
        // Duplicate kontrolü - aynı name ve title'a sahip deputy var mı?
        const coordinator = prev.coordinators.find(c => c.id === coordinatorId)
        
        if (!coordinator) {
          console.error('❌ addDeputy: Koordinatör bulunamadı', { coordinatorId })
          return prev
        }
        
        const existingDeputy = coordinator?.deputies?.find(d =>
          d.name === deputy.name && d.title === deputy.title
        )

        if (existingDeputy) {
          // Zaten varsa, mevcut data'yı döndür (ekleme yapma)
          return prev
        }

        const newDeputy: Deputy = {
          ...deputy,
          id: generateId(),
        }

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
      } catch (error) {
        console.error('❌ addDeputy hatası:', error)
        return prev
      }
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
    if (!coordinatorId || !subUnitId || !person || !person.name) {
      console.error('❌ addPerson: Geçersiz parametreler', { coordinatorId, subUnitId, person })
      return
    }
    
    setData(prev => {
      try {
        // Duplicate kontrolü - aynı name ve title'a sahip person var mı?
        const coordinator = prev.coordinators.find(c => c.id === coordinatorId)
        
        if (!coordinator) {
          console.error('❌ addPerson: Koordinatör bulunamadı', { coordinatorId })
          return prev
        }
        
        const subUnit = coordinator?.subUnits?.find(su => su.id === subUnitId)
        
        if (!subUnit) {
          console.error('❌ addPerson: Alt birim bulunamadı', { coordinatorId, subUnitId })
          return prev
        }
        
        const existingPerson = subUnit?.people?.find(p =>
          p.name === person.name && p.title === (person.title || '')
        )

        if (existingPerson) {
          // Zaten varsa, mevcut data'yı döndür (ekleme yapma)
          return prev
        }

        const newPerson: Person = {
          ...person,
          id: generateId(),
        }

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
      } catch (error) {
        console.error('❌ addPerson hatası:', error)
        return prev
      }
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

  // Delete person from sub unit
  const deletePerson = useCallback((coordinatorId: string, subUnitId: string, personId: string) => {
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
                        people: (su.people || []).filter(p => p.id !== personId)
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

  // Move person from one sub-unit to another
  const movePerson = useCallback((fromCoordinatorId: string, fromSubUnitId: string, personId: string, toCoordinatorId: string, toSubUnitId: string) => {
    setData(prev => {
      // Find the person to move
      let personToMove: Person | null = null
      
      const fromCoordinator = prev.coordinators.find(c => c.id === fromCoordinatorId)
      if (fromCoordinator) {
        const fromSubUnit = fromCoordinator.subUnits?.find(su => su.id === fromSubUnitId)
        if (fromSubUnit) {
          personToMove = fromSubUnit.people?.find(p => p.id === personId) || null
        }
      }

      if (!personToMove) return prev

      // Remove from old location and add to new location
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c => {
          if (c.id === fromCoordinatorId) {
            // Remove from old sub-unit
            return {
              ...c,
              subUnits: (c.subUnits || []).map(su =>
                su.id === fromSubUnitId
                  ? {
                      ...su,
                      people: (su.people || []).filter(p => p.id !== personId)
                    }
                  : su
              )
            }
          }
          if (c.id === toCoordinatorId) {
            // Add to new sub-unit
            return {
              ...c,
              subUnits: (c.subUnits || []).map(su =>
                su.id === toSubUnitId
                  ? {
                      ...su,
                      people: [...(su.people || []), personToMove!]
                    }
                  : su
              )
            }
          }
          return c
        })
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

  // Update sub unit (normKadro, responsibilities vb.)
  const updateSubUnit = useCallback((coordinatorId: string, subUnitId: string, updates: Partial<SubUnit>) => {
    setData(prev => {
      const newData = {
        ...prev,
        coordinators: prev.coordinators.map(c =>
          c.id === coordinatorId
            ? {
              ...c,
              subUnits: (c.subUnits || []).map(su =>
                su.id === subUnitId ? { ...su, ...updates } : su
              )
            }
            : c
        )
      }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Şehir bazlı personel ekleme (İl Sorumlusu veya Deneyap Sorumlusu)
  const addCityPerson = useCallback((city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', person: Omit<Person, 'id'>) => {
    setData(prev => {
      const cityPersonnel = prev.cityPersonnel || []
      const existingCity = cityPersonnel.find(cp => cp.city === city)

      const newPerson: Person = {
        ...person,
        id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      let newCityPersonnel: CityPersonnel[]
      if (existingCity) {
        newCityPersonnel = cityPersonnel.map(cp =>
          cp.city === city
            ? { ...cp, [role]: newPerson }
            : cp
        )
      } else {
        newCityPersonnel = [
          ...cityPersonnel,
          { 
            id: `city-${Date.now()}`, 
            city, 
            [role]: newPerson,
            people: [] // Geriye uyumluluk için
          }
        ]
      }

      const newData = { ...prev, cityPersonnel: newCityPersonnel }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Şehir bazlı personel güncelleme
  const updateCityPerson = useCallback((city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', personId: string, updates: Partial<Person>) => {
    setData(prev => {
      const newCityPersonnel = (prev.cityPersonnel || []).map(cp => {
        if (cp.city !== city) return cp
        
        const currentPerson = cp[role]
        if (currentPerson?.id === personId) {
          return {
            ...cp,
            [role]: { ...currentPerson, ...updates }
          }
        }
        return cp
      })

      const newData = { ...prev, cityPersonnel: newCityPersonnel }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Şehir bazlı personel silme
  const deleteCityPerson = useCallback((city: string, role: 'ilSorumlusu' | 'deneyapSorumlusu', personId: string) => {
    setData(prev => {
      const newCityPersonnel = (prev.cityPersonnel || []).map(cp => {
        if (cp.city !== city) return cp
        
        const currentPerson = cp[role]
        if (currentPerson?.id === personId) {
          return {
            ...cp,
            [role]: undefined
          }
        }
        return cp
      }).filter(cp => cp.ilSorumlusu || cp.deneyapSorumlusu || (cp.people && cp.people.length > 0)) // Boş şehirleri kaldır

      const newData = { ...prev, cityPersonnel: newCityPersonnel }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Tüm şehir personelini getir
  const getCityPersonnel = useCallback((): CityPersonnel[] => {
    return data.cityPersonnel || []
  }, [data.cityPersonnel])

  // Bölge sorumlusu ekleme
  const addRegionPerson = useCallback((region: string, person: Omit<Person, 'id'>) => {
    setData(prev => {
      const regionPersonnel = prev.regionPersonnel || []
      const existingRegion = regionPersonnel.find(rp => rp.region === region)

      const newPerson: Person = {
        ...person,
        id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      let newRegionPersonnel: RegionPersonnel[]
      if (existingRegion) {
        newRegionPersonnel = regionPersonnel.map(rp =>
          rp.region === region
            ? { ...rp, bolgeSorumlusu: newPerson }
            : rp
        )
      } else {
        newRegionPersonnel = [
          ...regionPersonnel,
          { 
            id: `region-${Date.now()}`, 
            region, 
            bolgeSorumlusu: newPerson
          }
        ]
      }

      const newData = { ...prev, regionPersonnel: newRegionPersonnel }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Bölge sorumlusu güncelleme
  const updateRegionPerson = useCallback((region: string, personId: string, updates: Partial<Person>) => {
    setData(prev => {
      const newRegionPersonnel = (prev.regionPersonnel || []).map(rp => {
        if (rp.region !== region) return rp
        
        if (rp.bolgeSorumlusu?.id === personId) {
          return {
            ...rp,
            bolgeSorumlusu: { ...rp.bolgeSorumlusu, ...updates }
          }
        }
        return rp
      })

      const newData = { ...prev, regionPersonnel: newRegionPersonnel }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Bölge sorumlusu silme
  const deleteRegionPerson = useCallback((region: string, personId: string) => {
    setData(prev => {
      const newRegionPersonnel = (prev.regionPersonnel || [])
        .map(rp => {
          if (rp.region !== region) return rp
          if (rp.bolgeSorumlusu?.id === personId) {
            return { ...rp, bolgeSorumlusu: undefined }
          }
          return rp
        })
        .filter(rp => rp.bolgeSorumlusu) // Boş bölgeleri kaldır

      const newData = { ...prev, regionPersonnel: newRegionPersonnel }
      saveToFirebase(newData)
      return newData
    })
  }, [saveToFirebase])

  // Tüm bölge personelini getir
  const getRegionPersonnel = useCallback((): RegionPersonnel[] => {
    return data.regionPersonnel || []
  }, [data.regionPersonnel])

  // Tüm personeli getir (koordinatör, deputy, alt birim personeli, şehir personeli)
  const getAllPersonnel = useCallback(() => {
    const allPersonnel: Array<{
      person: Person
      type: 'coordinator' | 'deputy' | 'subunit-person' | 'city-person'
      coordinatorId?: string
      coordinatorTitle?: string
      subUnitId?: string
      subUnitTitle?: string
      city?: string
      role?: 'ilSorumlusu' | 'deneyapSorumlusu' // Şehir personeli için role
    }> = []

    // Koordinatörler
    data.coordinators.forEach(coord => {
      if (coord.coordinator?.name) {
        allPersonnel.push({
          person: {
            id: coord.coordinator.name || `coord-${coord.id}`,
            name: coord.coordinator.name,
            title: coord.coordinator.title || 'Koordinatör',
            color: coord.coordinator.color,
            jobDescription: coord.responsibilities?.join('\n') || '',
          },
          type: 'coordinator',
          coordinatorId: coord.id,
          coordinatorTitle: coord.title,
        })
      }
    })

    // Deputies (Koordinatör Yardımcıları)
    data.coordinators.forEach(coord => {
      coord.deputies?.forEach(deputy => {
        allPersonnel.push({
          person: {
            id: deputy.id,
            name: deputy.name,
            title: deputy.title || '',
            color: deputy.color,
            jobDescription: deputy.responsibilities?.join('\n') || '',
          },
          type: 'deputy',
          coordinatorId: coord.id,
          coordinatorTitle: coord.title,
        })
      })
    })

    // Alt birim personeli
    data.coordinators.forEach(coord => {
      coord.subUnits?.forEach(subUnit => {
        subUnit.people?.forEach(person => {
          allPersonnel.push({
            person: {
              ...person,
              jobDescription: person.jobDescription || subUnit.responsibilities?.join('\n') || '',
            },
            type: 'subunit-person',
            coordinatorId: coord.id,
            coordinatorTitle: coord.title,
            subUnitId: subUnit.id,
            subUnitTitle: subUnit.title,
          })
        })
      })
    })

    // Şehir personeli (Toplumsal Çalışmalar için) - İl Sorumlusu ve Deneyap Sorumlusu
    data.cityPersonnel?.forEach(cityData => {
      if (cityData.ilSorumlusu) {
        allPersonnel.push({
          person: cityData.ilSorumlusu,
          type: 'city-person' as const,
          city: cityData.city,
          role: 'ilSorumlusu' as const,
        })
      }
      if (cityData.deneyapSorumlusu) {
        allPersonnel.push({
          person: cityData.deneyapSorumlusu,
          type: 'city-person' as const,
          city: cityData.city,
          role: 'deneyapSorumlusu' as const,
        })
      }
      // Geriye uyumluluk için people array'ini de kontrol et
      cityData.people?.forEach(person => {
        allPersonnel.push({
          person,
          type: 'city-person' as const,
          city: cityData.city,
        })
      })
    })

    return allPersonnel
  }, [data])

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

    // Unique ID oluştur ve duplicate kontrolü yap
    let newId = generateId()
    let attempts = 0
    while (data.coordinators.some(c => c.id === newId) || data.mainCoordinators.some(m => m.id === newId)) {
      newId = generateId()
      attempts++
      if (attempts > 10) {
        console.error('⚠️ Unique ID oluşturulamadı, fallback ID kullanılıyor')
        newId = `coord-${Date.now()}-${Math.random().toString(36).substr(2, 15)}`
        break
      }
    }

    const newCoordinator: Coordinator = {
      ...coordinator,
      id: newId,
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
    if (USE_LOCAL_ONLY) return
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
    if (USE_LOCAL_ONLY) return
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
      deletePerson,
      movePerson,
      deleteSubUnit,
      updateSubUnit,
      addCityPerson,
      updateCityPerson,
      deleteCityPerson,
      getCityPersonnel,
      addRegionPerson,
      updateRegionPerson,
      deleteRegionPerson,
      getRegionPersonnel,
      getAllPersonnel,
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
      restoreData,
      saveData,
      loadData,
      syncLocalToFirebase,
      syncInitialDataToFirebase,
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
