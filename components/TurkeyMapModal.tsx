'use client'

import { useState, useEffect } from 'react'
import { Person } from '@/context/OrgDataContext'

// Türkiye bölgeleri ve şehirleri
const regions = {
  marmara: {
    name: 'Marmara Bölgesi',
    color: '#DC2626', // Kırmızı
    cities: ['İstanbul', 'Tekirdağ', 'Edirne', 'Kırklareli', 'Kocaeli', 'Sakarya', 'Bilecik', 'Bursa', 'Yalova', 'Çanakkale', 'Balıkesir']
  },
  karadeniz: {
    name: 'Karadeniz Bölgesi',
    color: '#1F2937', // Siyah
    cities: ['Zonguldak', 'Bartın', 'Karabük', 'Kastamonu', 'Sinop', 'Samsun', 'Ordu', 'Giresun', 'Trabzon', 'Rize', 'Artvin', 'Gümüşhane', 'Bayburt', 'Amasya', 'Tokat', 'Çorum', 'Bolu', 'Düzce']
  },
  doguAnadolu: {
    name: 'Doğu Anadolu Bölgesi',
    color: '#16A34A', // Yeşil
    cities: ['Erzurum', 'Erzincan', 'Kars', 'Ardahan', 'Iğdır', 'Ağrı', 'Van', 'Muş', 'Bitlis', 'Hakkari', 'Bingöl', 'Tunceli', 'Elazığ', 'Malatya']
  },
  guneydoguAnadolu: {
    name: 'Güneydoğu Anadolu Bölgesi',
    color: '#4338CA', // Lacivert
    cities: ['Gaziantep', 'Adıyaman', 'Kilis', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Şırnak', 'Siirt']
  },
  akdeniz: {
    name: 'Akdeniz Bölgesi',
    color: '#7C3AED', // Mor
    cities: ['Antalya', 'Isparta', 'Burdur', 'Mersin', 'Adana', 'Osmaniye', 'Hatay', 'Kahramanmaraş']
  },
  ege: {
    name: 'Ege Bölgesi',
    color: '#2563EB', // Mavi
    cities: ['İzmir', 'Aydın', 'Muğla', 'Denizli', 'Manisa', 'Kütahya', 'Uşak', 'Afyonkarahisar']
  },
  icAnadolu: {
    name: 'İç Anadolu Bölgesi',
    color: '#EA580C', // Turuncu
    cities: ['Ankara', 'Eskişehir', 'Konya', 'Karaman', 'Aksaray', 'Niğde', 'Nevşehir', 'Kırşehir', 'Kırıkkale', 'Çankırı', 'Yozgat', 'Sivas', 'Kayseri']
  }
}

// Tüm şehirler listesi
const allCities = Object.values(regions).flatMap(r => r.cities).sort((a, b) => a.localeCompare(b, 'tr'))

// Şehir konumları (yaklaşık x,y koordinatları - SVG için)
const cityPositions: Record<string, { x: number; y: number; region: string }> = {
  'İstanbul': { x: 180, y: 85, region: 'marmara' },
  'Ankara': { x: 290, y: 145, region: 'icAnadolu' },
  'İzmir': { x: 130, y: 195, region: 'ege' },
  'Bursa': { x: 185, y: 120, region: 'marmara' },
  'Antalya': { x: 225, y: 265, region: 'akdeniz' },
  'Adana': { x: 320, y: 250, region: 'akdeniz' },
  'Konya': { x: 285, y: 210, region: 'icAnadolu' },
  'Gaziantep': { x: 360, y: 250, region: 'guneydoguAnadolu' },
  'Şanlıurfa': { x: 395, y: 245, region: 'guneydoguAnadolu' },
  'Diyarbakır': { x: 420, y: 210, region: 'guneydoguAnadolu' },
  'Kayseri': { x: 330, y: 175, region: 'icAnadolu' },
  'Mersin': { x: 300, y: 260, region: 'akdeniz' },
  'Eskişehir': { x: 225, y: 140, region: 'icAnadolu' },
  'Samsun': { x: 340, y: 90, region: 'karadeniz' },
  'Trabzon': { x: 420, y: 85, region: 'karadeniz' },
  'Erzurum': { x: 465, y: 115, region: 'doguAnadolu' },
  'Van': { x: 510, y: 175, region: 'doguAnadolu' },
  'Malatya': { x: 385, y: 175, region: 'doguAnadolu' },
  'Elazığ': { x: 405, y: 165, region: 'doguAnadolu' },
  'Mardin': { x: 440, y: 235, region: 'guneydoguAnadolu' },
  'Batman': { x: 455, y: 215, region: 'guneydoguAnadolu' },
  'Sivas': { x: 365, y: 140, region: 'icAnadolu' },
  'Denizli': { x: 180, y: 225, region: 'ege' },
  'Muğla': { x: 155, y: 250, region: 'ege' },
  'Aydın': { x: 145, y: 220, region: 'ege' },
  'Manisa': { x: 150, y: 180, region: 'ege' },
  'Balıkesir': { x: 155, y: 140, region: 'marmara' },
  'Tekirdağ': { x: 160, y: 75, region: 'marmara' },
  'Edirne': { x: 135, y: 60, region: 'marmara' },
  'Kocaeli': { x: 200, y: 100, region: 'marmara' },
  'Sakarya': { x: 220, y: 105, region: 'marmara' },
  'Zonguldak': { x: 265, y: 85, region: 'karadeniz' },
  'Çanakkale': { x: 130, y: 115, region: 'marmara' },
  'Kütahya': { x: 195, y: 160, region: 'ege' },
  'Afyonkarahisar': { x: 220, y: 180, region: 'ege' },
  'Isparta': { x: 225, y: 220, region: 'akdeniz' },
  'Burdur': { x: 205, y: 235, region: 'akdeniz' },
  'Hatay': { x: 345, y: 275, region: 'akdeniz' },
  'Kahramanmaraş': { x: 355, y: 220, region: 'akdeniz' },
  'Osmaniye': { x: 335, y: 255, region: 'akdeniz' },
  'Adıyaman': { x: 380, y: 210, region: 'guneydoguAnadolu' },
  'Kilis': { x: 355, y: 260, region: 'guneydoguAnadolu' },
  'Şırnak': { x: 480, y: 230, region: 'guneydoguAnadolu' },
  'Hakkari': { x: 515, y: 210, region: 'doguAnadolu' },
  'Siirt': { x: 470, y: 205, region: 'guneydoguAnadolu' },
  'Bitlis': { x: 485, y: 185, region: 'doguAnadolu' },
  'Muş': { x: 460, y: 165, region: 'doguAnadolu' },
  'Bingöl': { x: 435, y: 160, region: 'doguAnadolu' },
  'Tunceli': { x: 410, y: 150, region: 'doguAnadolu' },
  'Erzincan': { x: 420, y: 130, region: 'doguAnadolu' },
  'Bayburt': { x: 440, y: 105, region: 'karadeniz' },
  'Gümüşhane': { x: 420, y: 100, region: 'karadeniz' },
  'Rize': { x: 445, y: 85, region: 'karadeniz' },
  'Artvin': { x: 465, y: 75, region: 'karadeniz' },
  'Kars': { x: 500, y: 95, region: 'doguAnadolu' },
  'Ardahan': { x: 485, y: 75, region: 'doguAnadolu' },
  'Iğdır': { x: 520, y: 105, region: 'doguAnadolu' },
  'Ağrı': { x: 500, y: 130, region: 'doguAnadolu' },
  'Ordu': { x: 375, y: 90, region: 'karadeniz' },
  'Giresun': { x: 395, y: 90, region: 'karadeniz' },
  'Tokat': { x: 345, y: 115, region: 'karadeniz' },
  'Amasya': { x: 325, y: 105, region: 'karadeniz' },
  'Çorum': { x: 305, y: 110, region: 'karadeniz' },
  'Yozgat': { x: 320, y: 140, region: 'icAnadolu' },
  'Nevşehir': { x: 305, y: 175, region: 'icAnadolu' },
  'Niğde': { x: 305, y: 200, region: 'icAnadolu' },
  'Aksaray': { x: 290, y: 185, region: 'icAnadolu' },
  'Karaman': { x: 270, y: 220, region: 'icAnadolu' },
  'Kırşehir': { x: 305, y: 155, region: 'icAnadolu' },
  'Kırıkkale': { x: 290, y: 135, region: 'icAnadolu' },
  'Çankırı': { x: 280, y: 110, region: 'icAnadolu' },
  'Kastamonu': { x: 295, y: 85, region: 'karadeniz' },
  'Sinop': { x: 320, y: 75, region: 'karadeniz' },
  'Bartın': { x: 275, y: 80, region: 'karadeniz' },
  'Karabük': { x: 270, y: 95, region: 'karadeniz' },
  'Bolu': { x: 245, y: 100, region: 'karadeniz' },
  'Düzce': { x: 235, y: 95, region: 'karadeniz' },
  'Bilecik': { x: 205, y: 120, region: 'marmara' },
  'Yalova': { x: 195, y: 110, region: 'marmara' },
  'Kırklareli': { x: 150, y: 55, region: 'marmara' },
  'Uşak': { x: 180, y: 185, region: 'ege' },
}

export interface CityPersonnel {
  id: string
  city: string
  people: Person[]
}

interface TurkeyMapModalProps {
  isOpen: boolean
  onClose: () => void
  cityPersonnel: CityPersonnel[]
  onUpdateCityPersonnel: (city: string, people: Person[]) => void
  onAddPerson: (city: string, person: Omit<Person, 'id'>) => void
  onUpdatePerson: (city: string, personId: string, updates: Partial<Person>) => void
  onDeletePerson: (city: string, personId: string) => void
}

export default function TurkeyMapModal({
  isOpen,
  onClose,
  cityPersonnel,
  onUpdateCityPersonnel,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}: TurkeyMapModalProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPerson, setNewPerson] = useState<{
    name: string
    title: string
    email: string
    phone: string
    notes: string
    cvFileName?: string
    cvData?: string
  }>({ name: '', title: '', email: '', phone: '', notes: '' })

  if (!isOpen) return null

  const getCityPeople = (city: string): Person[] => {
    const cityData = cityPersonnel.find(cp => cp.city === city)
    return cityData?.people || []
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setNewPerson(prev => ({
          ...prev,
          cvFileName: file.name,
          cvData: event.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const getRegionColor = (city: string): string => {
    const pos = cityPositions[city]
    if (!pos) return '#gray'
    const region = regions[pos.region as keyof typeof regions]
    return region?.color || '#gray'
  }

  const handleAddPerson = () => {
    if (selectedCity && newPerson.name) {
      onAddPerson(selectedCity, newPerson)
      setNewPerson({ name: '', title: '', email: '', phone: '', notes: '' })
      setShowAddForm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex" onClick={onClose}>
      {/* Sol taraf - Harita */}
      <div 
        className="w-2/3 h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6 overflow-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Toplumsal Çalışmalar Koordinatörlüğü
            </h2>
            <p className="text-gray-500 mt-1">Türkiye geneli personel dağılımı</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bölge Legendı */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(regions).map(([key, region]) => (
            <div key={key} className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full shadow-sm">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: region.color }}></div>
              <span className="text-xs font-medium text-gray-700">{region.name}</span>
            </div>
          ))}
        </div>

        {/* Harita SVG */}
        <div className="relative bg-white rounded-2xl shadow-xl p-4 overflow-hidden">
          <svg viewBox="0 0 800 400" className="w-full h-auto" style={{ minHeight: '450px' }}>
            <defs>
              {/* Kesikli çizgi pattern */}
              <pattern id="cityBorder" patternUnits="userSpaceOnUse" width="8" height="8">
                <path d="M0,4 L8,4" stroke="#666" strokeWidth="1" strokeDasharray="3,2"/>
              </pattern>
            </defs>

            {/* Marmara Bölgesi */}
            <path
              d="M120,80 L180,60 L220,55 L260,75 L280,95 L270,130 L240,150 L200,155 L160,150 L130,130 L110,100 Z"
              fill={regions.marmara.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="175" y="105" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">Marmara</text>
            <text x="175" y="118" textAnchor="middle" fontSize="9" fill="white">Bölgesi</text>

            {/* Ege Bölgesi */}
            <path
              d="M100,150 L160,150 L200,155 L210,200 L220,250 L200,290 L150,310 L100,280 L80,230 L75,180 Z"
              fill={regions.ege.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="145" y="220" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">Ege</text>
            <text x="145" y="235" textAnchor="middle" fontSize="9" fill="white">Bölgesi</text>

            {/* İç Anadolu Bölgesi */}
            <path
              d="M240,150 L270,130 L340,110 L420,120 L460,140 L470,190 L450,250 L380,270 L300,280 L250,260 L220,220 L210,180 Z"
              fill={regions.icAnadolu.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="340" y="185" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">İç Anadolu</text>
            <text x="340" y="200" textAnchor="middle" fontSize="9" fill="white">Bölgesi</text>

            {/* Karadeniz Bölgesi */}
            <path
              d="M260,75 L280,95 L340,85 L400,75 L480,65 L560,80 L600,100 L580,130 L540,140 L480,135 L420,120 L340,110 L270,130 Z"
              fill={regions.karadeniz.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="430" y="100" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">Karadeniz Bölgesi</text>

            {/* Akdeniz Bölgesi */}
            <path
              d="M200,290 L220,250 L260,270 L350,280 L420,290 L470,310 L400,340 L300,350 L220,340 L170,320 Z"
              fill={regions.akdeniz.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="320" y="315" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">Akdeniz Bölgesi</text>

            {/* Doğu Anadolu Bölgesi */}
            <path
              d="M540,140 L580,130 L640,110 L700,100 L740,130 L750,180 L720,230 L660,250 L600,240 L550,220 L520,180 L510,150 Z"
              fill={regions.doguAnadolu.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="640" y="165" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">Doğu Anadolu</text>
            <text x="640" y="180" textAnchor="middle" fontSize="9" fill="white">Bölgesi</text>

            {/* Güneydoğu Anadolu Bölgesi */}
            <path
              d="M470,260 L520,240 L600,240 L660,250 L680,290 L640,330 L570,345 L500,330 L460,300 Z"
              fill={regions.guneydoguAnadolu.color}
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-90 transition-all"
            />
            <text x="560" y="285" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Güneydoğu Anadolu</text>
            <text x="560" y="300" textAnchor="middle" fontSize="8" fill="white">Bölgesi</text>

            {/* Şehir noktaları */}
            {Object.entries(cityPositions).map(([city, pos]) => {
              const people = getCityPeople(city)
              const hasPeople = people.length > 0
              // Koordinatları yeniden hesapla (ölçekleme)
              const scaledX = (pos.x / 580) * 800
              const scaledY = (pos.y / 320) * 400
              
              return (
                <g key={city}>
                  {/* Şehir noktası */}
                  <circle
                    cx={scaledX}
                    cy={scaledY}
                    r={hasPeople ? 10 : 5}
                    fill={hasPeople ? 'white' : 'rgba(255,255,255,0.5)'}
                    stroke={getRegionColor(city)}
                    strokeWidth={hasPeople ? 3 : 1}
                    className="cursor-pointer transition-all duration-200 hover:scale-150"
                    style={{ filter: hasPeople ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none' }}
                    onMouseEnter={() => setHoveredCity(city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCity(city)
                    }}
                  />
                  
                  {/* Personel sayısı badge */}
                  {hasPeople && (
                    <text
                      x={scaledX}
                      y={scaledY + 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill={getRegionColor(city)}
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {people.length}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Toplam istatistik */}
        <div className="mt-4 flex gap-4">
          <div className="bg-white rounded-xl p-4 shadow-lg flex-1">
            <div className="text-3xl font-bold text-blue-600">
              {cityPersonnel.reduce((acc, cp) => acc + cp.people.length, 0)}
            </div>
            <div className="text-sm text-gray-500">Toplam Personel</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg flex-1">
            <div className="text-3xl font-bold text-green-600">
              {cityPersonnel.filter(cp => cp.people.length > 0).length}
            </div>
            <div className="text-sm text-gray-500">Aktif Şehir</div>
          </div>
        </div>
      </div>

      {/* Sağ taraf - Şehir detayı */}
      <div 
        className="w-1/3 h-full bg-white shadow-2xl overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {selectedCity ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCity}</h3>
                  <p className="text-blue-200">
                    {regions[cityPositions[selectedCity]?.region as keyof typeof regions]?.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="bg-white/20 rounded-lg px-4 py-2">
                  <span className="text-2xl font-bold">{getCityPeople(selectedCity).length}</span>
                  <span className="text-sm ml-1">Personel</span>
                </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Personel Ekle
                </button>
              </div>
            </div>

            {/* Personel Ekleme Formu */}
            {showAddForm && (
              <div className="p-4 bg-blue-50 border-b">
                <h4 className="font-semibold text-gray-800 mb-3">Yeni Personel Ekle</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ad Soyad *"
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Ünvan"
                    value={newPerson.title}
                    onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    placeholder="E-posta"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Telefon"
                    value={newPerson.phone}
                    onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <textarea
                    placeholder="Görevler / Notlar"
                    value={newPerson.notes}
                    onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  
                  {/* CV Yükleme */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                    <input
                      type="file"
                      id="cv-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCVUpload}
                      className="hidden"
                    />
                    {newPerson.cvFileName ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-green-600">{newPerson.cvFileName}</span>
                        <button
                          type="button"
                          onClick={() => setNewPerson(prev => ({ ...prev, cvFileName: undefined, cvData: undefined }))}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Kaldır
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="cv-upload" className="cursor-pointer">
                        <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-500">CV Yükle (PDF, DOC)</span>
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPerson}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      Ekle
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setNewPerson({ name: '', title: '', email: '', phone: '', notes: '' })
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Personel Listesi */}
            <div className="flex-1 overflow-auto p-4">
              {getCityPeople(selectedCity).length > 0 ? (
                <div className="space-y-3">
                  {getCityPeople(selectedCity).map((person) => (
                    <div
                      key={person.id}
                      className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                            {person.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{person.name}</h4>
                            <p className="text-sm text-gray-500">{person.title || 'Personel'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`"${person.name}" silinecek. Emin misiniz?`)) {
                              onDeletePerson(selectedCity, person.id)
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* İletişim */}
                      <div className="mt-3 space-y-1">
                        {person.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {person.email}
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {person.phone}
                          </div>
                        )}
                      </div>

                      {/* Görevler */}
                      {person.notes && (
                        <div className="mt-3 bg-amber-50 rounded-lg p-3">
                          <p className="text-xs text-amber-600 font-medium mb-1">Görevler</p>
                          <p className="text-sm text-gray-700">{person.notes}</p>
                        </div>
                      )}

                      {/* CV */}
                      {person.cvFileName && (
                        <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-lg p-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-green-700 flex-1">{person.cvFileName}</span>
                          {person.cvData && (
                            <button
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = person.cvData!
                                link.download = person.cvFileName!
                                link.click()
                              }}
                              className="text-green-600 hover:text-green-800 text-xs font-medium"
                            >
                              İndir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-500 mb-4">Bu şehirde henüz personel yok</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + İlk personeli ekle
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Şehir Seçin</h3>
              <p className="text-gray-500">Haritadan bir şehre tıklayarak<br />personel bilgilerini görüntüleyin</p>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip - Şehir üzerine gelince */}
      {hoveredCity && mousePos.x > 0 && (
        <div
          className="fixed z-[200] bg-gray-900 text-white rounded-xl shadow-2xl p-4 pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            maxWidth: 280,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getRegionColor(hoveredCity) }}
            ></div>
            <span className="font-bold text-lg">{hoveredCity}</span>
          </div>
          <p className="text-gray-400 text-sm mb-2">
            {regions[cityPositions[hoveredCity]?.region as keyof typeof regions]?.name}
          </p>
          
          {getCityPeople(hoveredCity).length > 0 ? (
            <div className="space-y-2">
              <p className="text-green-400 text-sm font-medium">
                {getCityPeople(hoveredCity).length} Personel
              </p>
              {getCityPeople(hoveredCity).slice(0, 3).map((person) => (
                <div key={person.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm">{person.name}</p>
                    <p className="text-xs text-gray-400">{person.title}</p>
                  </div>
                </div>
              ))}
              {getCityPeople(hoveredCity).length > 3 && (
                <p className="text-xs text-gray-400">
                  +{getCityPeople(hoveredCity).length - 3} kişi daha...
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Henüz personel yok</p>
          )}
          
          <p className="text-xs text-blue-400 mt-2">Detay için tıklayın</p>
        </div>
      )}
    </div>
  )
}
