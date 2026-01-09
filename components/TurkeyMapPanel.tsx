'use client'

import { useState } from 'react'
import { Person } from '@/context/OrgDataContext'

// Türkiye bölgeleri ve şehirleri
const regions = {
  marmara: {
    name: 'Marmara Bölgesi',
    color: '#DC2626',
    cities: ['İstanbul', 'Tekirdağ', 'Edirne', 'Kırklareli', 'Kocaeli', 'Sakarya', 'Bilecik', 'Bursa', 'Yalova', 'Çanakkale', 'Balıkesir']
  },
  karadeniz: {
    name: 'Karadeniz Bölgesi',
    color: '#1F2937',
    cities: ['Zonguldak', 'Bartın', 'Karabük', 'Kastamonu', 'Sinop', 'Samsun', 'Ordu', 'Giresun', 'Trabzon', 'Rize', 'Artvin', 'Gümüşhane', 'Bayburt', 'Amasya', 'Tokat', 'Çorum', 'Bolu', 'Düzce']
  },
  doguAnadolu: {
    name: 'Doğu Anadolu Bölgesi',
    color: '#16A34A',
    cities: ['Erzurum', 'Erzincan', 'Kars', 'Ardahan', 'Iğdır', 'Ağrı', 'Van', 'Muş', 'Bitlis', 'Hakkari', 'Bingöl', 'Tunceli', 'Elazığ', 'Malatya']
  },
  guneydoguAnadolu: {
    name: 'Güneydoğu Anadolu Bölgesi',
    color: '#4338CA',
    cities: ['Gaziantep', 'Adıyaman', 'Kilis', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Şırnak', 'Siirt']
  },
  akdeniz: {
    name: 'Akdeniz Bölgesi',
    color: '#7C3AED',
    cities: ['Antalya', 'Isparta', 'Burdur', 'Mersin', 'Adana', 'Osmaniye', 'Hatay', 'Kahramanmaraş']
  },
  ege: {
    name: 'Ege Bölgesi',
    color: '#2563EB',
    cities: ['İzmir', 'Aydın', 'Muğla', 'Denizli', 'Manisa', 'Kütahya', 'Uşak', 'Afyonkarahisar']
  },
  icAnadolu: {
    name: 'İç Anadolu Bölgesi',
    color: '#EA580C',
    cities: ['Ankara', 'Eskişehir', 'Konya', 'Karaman', 'Aksaray', 'Niğde', 'Nevşehir', 'Kırşehir', 'Kırıkkale', 'Çankırı', 'Yozgat', 'Sivas', 'Kayseri']
  }
}

// Şehir konumları
const cityPositions: Record<string, { x: number; y: number; region: string }> = {
  'İstanbul': { x: 145, y: 65, region: 'marmara' },
  'Ankara': { x: 240, y: 115, region: 'icAnadolu' },
  'İzmir': { x: 105, y: 155, region: 'ege' },
  'Bursa': { x: 150, y: 95, region: 'marmara' },
  'Antalya': { x: 185, y: 210, region: 'akdeniz' },
  'Adana': { x: 260, y: 200, region: 'akdeniz' },
  'Konya': { x: 235, y: 165, region: 'icAnadolu' },
  'Gaziantep': { x: 295, y: 200, region: 'guneydoguAnadolu' },
  'Şanlıurfa': { x: 320, y: 195, region: 'guneydoguAnadolu' },
  'Diyarbakır': { x: 345, y: 170, region: 'guneydoguAnadolu' },
  'Kayseri': { x: 270, y: 140, region: 'icAnadolu' },
  'Mersin': { x: 245, y: 210, region: 'akdeniz' },
  'Eskişehir': { x: 185, y: 110, region: 'icAnadolu' },
  'Samsun': { x: 280, y: 70, region: 'karadeniz' },
  'Trabzon': { x: 345, y: 65, region: 'karadeniz' },
  'Erzurum': { x: 385, y: 90, region: 'doguAnadolu' },
  'Van': { x: 420, y: 140, region: 'doguAnadolu' },
  'Malatya': { x: 315, y: 140, region: 'doguAnadolu' },
  'Elazığ': { x: 330, y: 130, region: 'doguAnadolu' },
  'Mardin': { x: 360, y: 190, region: 'guneydoguAnadolu' },
  'Sivas': { x: 300, y: 110, region: 'icAnadolu' },
  'Denizli': { x: 145, y: 180, region: 'ege' },
  'Tekirdağ': { x: 130, y: 55, region: 'marmara' },
  'Edirne': { x: 108, y: 45, region: 'marmara' },
  'Kocaeli': { x: 163, y: 78, region: 'marmara' },
  'Hatay': { x: 280, y: 220, region: 'akdeniz' },
}

export interface CityPersonnel {
  id: string
  city: string
  people: Person[]
}

interface TurkeyMapPanelProps {
  isOpen: boolean
  onClose: () => void
  cityPersonnel: CityPersonnel[]
  onAddPerson: (city: string, person: Omit<Person, 'id'>) => void
  onUpdatePerson: (city: string, personId: string, updates: Partial<Person>) => void
  onDeletePerson: (city: string, personId: string) => void
}

export default function TurkeyMapPanel({
  isOpen,
  onClose,
  cityPersonnel,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}: TurkeyMapPanelProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
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

  const getRegionColor = (city: string): string => {
    const pos = cityPositions[city]
    if (!pos) return '#gray'
    const region = regions[pos.region as keyof typeof regions]
    return region?.color || '#gray'
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

  const handleAddPerson = () => {
    if (selectedCity && newPerson.name) {
      onAddPerson(selectedCity, newPerson)
      setNewPerson({ name: '', title: '', email: '', phone: '', notes: '' })
      setShowAddForm(false)
    }
  }

  return (
    <div 
      className="w-[500px] h-full bg-gradient-to-b from-slate-50 to-blue-50 border-r-2 border-blue-200 shadow-xl flex flex-col overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Toplumsal Çalışmalar
            </h2>
            <p className="text-blue-200 text-xs">Türkiye Geneli Personel</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Harita */}
      <div className="p-3 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-lg p-2 relative">
          <svg viewBox="0 0 450 250" className="w-full h-auto">
            {/* Marmara Bölgesi */}
            <path
              d="M95,50 L145,40 L175,45 L210,60 L225,75 L215,105 L190,120 L160,123 L128,115 L105,95 L88,75 Z"
              fill={regions.marmara.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
            />
            
            {/* Ege Bölgesi */}
            <path
              d="M80,120 L128,115 L160,123 L168,160 L175,200 L158,225 L120,240 L80,220 L65,180 L60,140 Z"
              fill={regions.ege.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
            />

            {/* İç Anadolu Bölgesi */}
            <path
              d="M190,95 L215,75 L270,85 L340,90 L365,115 L375,150 L360,200 L305,220 L240,205 L200,175 L168,160 L175,130 Z"
              fill={regions.icAnadolu.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
            />

            {/* Karadeniz Bölgesi */}
            <path
              d="M205,45 L270,35 L320,30 L380,35 L420,50 L440,70 L430,95 L400,100 L340,90 L270,85 L210,70 Z"
              fill={regions.karadeniz.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
            />

            {/* Akdeniz Bölgesi */}
            <path
              d="M158,225 L175,200 L210,210 L280,220 L340,230 L375,245 L320,265 L240,270 L175,260 L135,245 Z"
              fill={regions.akdeniz.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
            />

            {/* Doğu Anadolu Bölgesi */}
            <path
              d="M365,60 L430,50 L500,55 L530,80 L540,130 L520,170 L475,185 L430,175 L395,150 L375,115 L370,85 Z"
              fill={regions.doguAnadolu.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
              transform="scale(0.85) translate(0, 10)"
            />

            {/* Güneydoğu Anadolu Bölgesi */}
            <path
              d="M305,160 L350,145 L400,155 L440,170 L455,205 L420,240 L360,250 L310,240 L285,210 Z"
              fill={regions.guneydoguAnadolu.color}
              fillOpacity="0.75"
              stroke="white"
              strokeWidth="1.5"
              className="hover:fill-opacity-90 transition-all"
            />

            {/* Şehir noktaları */}
            {Object.entries(cityPositions).map(([city, pos]) => {
              const people = getCityPeople(city)
              const hasPeople = people.length > 0
              
              return (
                <g key={city}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={hasPeople ? 8 : 4}
                    fill={hasPeople ? 'white' : 'rgba(255,255,255,0.6)'}
                    stroke={getRegionColor(city)}
                    strokeWidth={hasPeople ? 2 : 1}
                    className="cursor-pointer transition-all duration-200 hover:scale-150"
                    style={{ filter: hasPeople ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : 'none' }}
                    onMouseEnter={() => setHoveredCity(city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => setSelectedCity(city)}
                  />
                  {hasPeople && (
                    <text
                      x={pos.x}
                      y={pos.y + 3}
                      textAnchor="middle"
                      fontSize="8"
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

          {/* Legend */}
          <div className="flex flex-wrap gap-1.5 mt-2 px-1">
            {Object.entries(regions).map(([key, region]) => (
              <div key={key} className="flex items-center gap-1 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: region.color }}></div>
                <span className="text-gray-600">{region.name.replace(' Bölgesi', '')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Şehir Detayı veya Genel Bilgi */}
      <div className="flex-1 overflow-auto px-3 pb-3">
        {selectedCity ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Şehir Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedCity}</h3>
                  <p className="text-slate-300 text-xs">
                    {regions[cityPositions[selectedCity]?.region as keyof typeof regions]?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-1 rounded text-sm font-bold">
                    {getCityPeople(selectedCity).length} Kişi
                  </span>
                  <button
                    onClick={() => setSelectedCity(null)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 w-full bg-white/20 hover:bg-white/30 py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Personel Ekle
              </button>
            </div>

            {/* Personel Ekleme Formu */}
            {showAddForm && (
              <div className="p-3 bg-blue-50 border-b space-y-2">
                <input
                  type="text"
                  placeholder="Ad Soyad *"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Ünvan / Görev"
                  value={newPerson.title}
                  onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="E-posta"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                    className="px-2 py-1.5 border rounded text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Telefon"
                    value={newPerson.phone}
                    onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                    className="px-2 py-1.5 border rounded text-sm"
                  />
                </div>
                <textarea
                  placeholder="Notlar"
                  value={newPerson.notes}
                  onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
                
                {/* CV Yükleme */}
                <div className="border border-dashed border-gray-300 rounded p-2 text-center bg-white">
                  <input
                    type="file"
                    id="cv-upload-panel"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCVUpload}
                    className="hidden"
                  />
                  {newPerson.cvFileName ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="text-green-600">✓ {newPerson.cvFileName}</span>
                      <button
                        type="button"
                        onClick={() => setNewPerson(prev => ({ ...prev, cvFileName: undefined, cvData: undefined }))}
                        className="text-red-500 text-xs"
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="cv-upload-panel" className="cursor-pointer text-sm text-gray-500">
                      📎 CV Yükle
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddPerson}
                    className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Ekle
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setNewPerson({ name: '', title: '', email: '', phone: '', notes: '' })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm font-medium hover:bg-gray-300"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            {/* Personel Listesi */}
            <div className="p-2 space-y-2 max-h-[300px] overflow-auto">
              {getCityPeople(selectedCity).length > 0 ? (
                getCityPeople(selectedCity).map((person) => (
                  <div
                    key={person.id}
                    className="bg-gray-50 rounded-lg p-2 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-800">{person.name}</p>
                          <p className="text-xs text-gray-500">{person.title || 'Personel'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`"${person.name}" silinecek?`)) {
                            onDeletePerson(selectedCity, person.id)
                          }
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {(person.email || person.phone) && (
                      <div className="mt-1 text-xs text-gray-500 pl-10">
                        {person.email && <span>{person.email}</span>}
                        {person.email && person.phone && <span> • </span>}
                        {person.phone && <span>{person.phone}</span>}
                      </div>
                    )}
                    {person.cvFileName && (
                      <div className="mt-1 pl-10">
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          📄 {person.cvFileName}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">Henüz personel yok</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-blue-500 text-sm mt-1 hover:underline"
                  >
                    + İlk personeli ekle
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Genel İstatistik */
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Genel Özet</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {cityPersonnel.reduce((acc, cp) => acc + cp.people.length, 0)}
                  </div>
                  <div className="text-xs text-gray-500">Toplam Personel</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {cityPersonnel.filter(cp => cp.people.length > 0).length}
                  </div>
                  <div className="text-xs text-gray-500">Aktif Şehir</div>
                </div>
              </div>
            </div>

            {/* Aktif şehirler listesi */}
            {cityPersonnel.filter(cp => cp.people.length > 0).length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Aktif Şehirler</h3>
                <div className="space-y-1">
                  {cityPersonnel
                    .filter(cp => cp.people.length > 0)
                    .sort((a, b) => b.people.length - a.people.length)
                    .map((cp) => (
                      <button
                        key={cp.city}
                        onClick={() => setSelectedCity(cp.city)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-left"
                      >
                        <span className="font-medium text-sm">{cp.city}</span>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {cp.people.length} kişi
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              Haritadan bir şehre tıklayarak personel ekleyebilirsiniz
            </p>
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredCity && (
        <div
          className="fixed z-[200] bg-gray-900 text-white rounded-lg shadow-xl p-3 pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            maxWidth: 220,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getRegionColor(hoveredCity) }}
            ></div>
            <span className="font-bold">{hoveredCity}</span>
          </div>
          <p className="text-gray-400 text-xs mb-1">
            {regions[cityPositions[hoveredCity]?.region as keyof typeof regions]?.name}
          </p>
          
          {getCityPeople(hoveredCity).length > 0 ? (
            <div className="space-y-1">
              <p className="text-green-400 text-xs font-medium">
                {getCityPeople(hoveredCity).length} Personel
              </p>
              {getCityPeople(hoveredCity).slice(0, 2).map((person) => (
                <div key={person.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px]">
                    {person.name.charAt(0)}
                  </div>
                  <span>{person.name}</span>
                </div>
              ))}
              {getCityPeople(hoveredCity).length > 2 && (
                <p className="text-xs text-gray-400">
                  +{getCityPeople(hoveredCity).length - 2} kişi daha
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-xs">Henüz personel yok</p>
          )}
          
          <p className="text-[10px] text-blue-400 mt-1">Tıklayarak düzenle</p>
        </div>
      )}
    </div>
  )
}
