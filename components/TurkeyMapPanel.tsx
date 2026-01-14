'use client'

import { useState } from 'react'
import { X, Plus, Edit2, Trash2, MapPin, Users, Phone, Mail, User } from 'lucide-react'
import ConfirmationModal from './ConfirmationModal'
import { showToast } from './Toast'
import { CityPersonnel, Person } from '@/context/OrgDataContext'

// Geriye uyumluluk için export ediyoruz
export type { CityPersonnel, Person }

interface TurkeyMapPanelProps {
  isOpen: boolean
  onClose: () => void
  cityPersonnel: CityPersonnel[]
  onAddPerson: (city: string, person: Omit<Person, 'id'>) => void
  onUpdatePerson: (city: string, personId: string, updates: Partial<Person>) => void
  onDeletePerson: (city: string, personId: string) => void
}

// Türkiye illeri veri seti
const turkeyProvinces: { id: string; name: string; plateCode: string; region: string }[] = [
  // Marmara (bolge-1)
  { id: 'balikesir', name: 'Balıkesir', plateCode: '10', region: 'Marmara' },
  { id: 'bilecik', name: 'Bilecik', plateCode: '11', region: 'Marmara' },
  { id: 'bursa', name: 'Bursa', plateCode: '16', region: 'Marmara' },
  { id: 'canakkale', name: 'Çanakkale', plateCode: '17', region: 'Marmara' },
  { id: 'edirne', name: 'Edirne', plateCode: '22', region: 'Marmara' },
  { id: 'istanbul', name: 'İstanbul', plateCode: '34', region: 'Marmara' },
  { id: 'kirklareli', name: 'Kırklareli', plateCode: '39', region: 'Marmara' },
  { id: 'kocaeli', name: 'Kocaeli', plateCode: '41', region: 'Marmara' },
  { id: 'sakarya', name: 'Sakarya', plateCode: '54', region: 'Marmara' },
  { id: 'tekirdag', name: 'Tekirdağ', plateCode: '59', region: 'Marmara' },
  { id: 'yalova', name: 'Yalova', plateCode: '77', region: 'Marmara' },
  // İç Anadolu (bolge-2)
  { id: 'ankara', name: 'Ankara', plateCode: '06', region: 'İç Anadolu' },
  { id: 'cankiri', name: 'Çankırı', plateCode: '18', region: 'İç Anadolu' },
  { id: 'eskisehir', name: 'Eskişehir', plateCode: '26', region: 'İç Anadolu' },
  { id: 'kayseri', name: 'Kayseri', plateCode: '38', region: 'İç Anadolu' },
  { id: 'kirsehir', name: 'Kırşehir', plateCode: '40', region: 'İç Anadolu' },
  { id: 'konya', name: 'Konya', plateCode: '42', region: 'İç Anadolu' },
  { id: 'nevsehir', name: 'Nevşehir', plateCode: '50', region: 'İç Anadolu' },
  { id: 'nigde', name: 'Niğde', plateCode: '51', region: 'İç Anadolu' },
  { id: 'sivas', name: 'Sivas', plateCode: '58', region: 'İç Anadolu' },
  { id: 'yozgat', name: 'Yozgat', plateCode: '66', region: 'İç Anadolu' },
  { id: 'aksaray', name: 'Aksaray', plateCode: '68', region: 'İç Anadolu' },
  { id: 'karaman', name: 'Karaman', plateCode: '70', region: 'İç Anadolu' },
  { id: 'kirikkale', name: 'Kırıkkale', plateCode: '71', region: 'İç Anadolu' },
  // Ege (bolge-3)
  { id: 'afyon', name: 'Afyonkarahisar', plateCode: '03', region: 'Ege' },
  { id: 'aydin', name: 'Aydın', plateCode: '09', region: 'Ege' },
  { id: 'denizli', name: 'Denizli', plateCode: '20', region: 'Ege' },
  { id: 'izmir', name: 'İzmir', plateCode: '35', region: 'Ege' },
  { id: 'kutahya', name: 'Kütahya', plateCode: '43', region: 'Ege' },
  { id: 'manisa', name: 'Manisa', plateCode: '45', region: 'Ege' },
  { id: 'mugla', name: 'Muğla', plateCode: '48', region: 'Ege' },
  { id: 'usak', name: 'Uşak', plateCode: '64', region: 'Ege' },
  // Akdeniz (bolge-4)
  { id: 'adana', name: 'Adana', plateCode: '01', region: 'Akdeniz' },
  { id: 'antalya', name: 'Antalya', plateCode: '07', region: 'Akdeniz' },
  { id: 'burdur', name: 'Burdur', plateCode: '15', region: 'Akdeniz' },
  { id: 'hatay', name: 'Hatay', plateCode: '31', region: 'Akdeniz' },
  { id: 'isparta', name: 'Isparta', plateCode: '32', region: 'Akdeniz' },
  { id: 'mersin', name: 'Mersin', plateCode: '33', region: 'Akdeniz' },
  { id: 'kahramanmaras', name: 'Kahramanmaraş', plateCode: '46', region: 'Akdeniz' },
  { id: 'osmaniye', name: 'Osmaniye', plateCode: '80', region: 'Akdeniz' },
  // Karadeniz (bolge-5)
  { id: 'amasya', name: 'Amasya', plateCode: '05', region: 'Karadeniz' },
  { id: 'artvin', name: 'Artvin', plateCode: '08', region: 'Karadeniz' },
  { id: 'bolu', name: 'Bolu', plateCode: '14', region: 'Karadeniz' },
  { id: 'corum', name: 'Çorum', plateCode: '19', region: 'Karadeniz' },
  { id: 'giresun', name: 'Giresun', plateCode: '28', region: 'Karadeniz' },
  { id: 'gumushane', name: 'Gümüşhane', plateCode: '29', region: 'Karadeniz' },
  { id: 'kastamonu', name: 'Kastamonu', plateCode: '37', region: 'Karadeniz' },
  { id: 'ordu', name: 'Ordu', plateCode: '52', region: 'Karadeniz' },
  { id: 'rize', name: 'Rize', plateCode: '53', region: 'Karadeniz' },
  { id: 'samsun', name: 'Samsun', plateCode: '55', region: 'Karadeniz' },
  { id: 'sinop', name: 'Sinop', plateCode: '57', region: 'Karadeniz' },
  { id: 'tokat', name: 'Tokat', plateCode: '60', region: 'Karadeniz' },
  { id: 'trabzon', name: 'Trabzon', plateCode: '61', region: 'Karadeniz' },
  { id: 'zonguldak', name: 'Zonguldak', plateCode: '67', region: 'Karadeniz' },
  { id: 'bayburt', name: 'Bayburt', plateCode: '69', region: 'Karadeniz' },
  { id: 'bartin', name: 'Bartın', plateCode: '74', region: 'Karadeniz' },
  { id: 'karabuk', name: 'Karabük', plateCode: '78', region: 'Karadeniz' },
  { id: 'duzce', name: 'Düzce', plateCode: '81', region: 'Karadeniz' },
  // Güneydoğu Anadolu (bolge-6)
  { id: 'adiyaman', name: 'Adıyaman', plateCode: '02', region: 'Güneydoğu Anadolu' },
  { id: 'diyarbakir', name: 'Diyarbakır', plateCode: '21', region: 'Güneydoğu Anadolu' },
  { id: 'gaziantep', name: 'Gaziantep', plateCode: '27', region: 'Güneydoğu Anadolu' },
  { id: 'mardin', name: 'Mardin', plateCode: '47', region: 'Güneydoğu Anadolu' },
  { id: 'siirt', name: 'Siirt', plateCode: '56', region: 'Güneydoğu Anadolu' },
  { id: 'sanliurfa', name: 'Şanlıurfa', plateCode: '63', region: 'Güneydoğu Anadolu' },
  { id: 'batman', name: 'Batman', plateCode: '72', region: 'Güneydoğu Anadolu' },
  { id: 'sirnak', name: 'Şırnak', plateCode: '73', region: 'Güneydoğu Anadolu' },
  { id: 'kilis', name: 'Kilis', plateCode: '79', region: 'Güneydoğu Anadolu' },
  // Doğu Anadolu (bolge-7)
  { id: 'agri', name: 'Ağrı', plateCode: '04', region: 'Doğu Anadolu' },
  { id: 'bingol', name: 'Bingöl', plateCode: '12', region: 'Doğu Anadolu' },
  { id: 'bitlis', name: 'Bitlis', plateCode: '13', region: 'Doğu Anadolu' },
  { id: 'elazig', name: 'Elazığ', plateCode: '23', region: 'Doğu Anadolu' },
  { id: 'erzincan', name: 'Erzincan', plateCode: '24', region: 'Doğu Anadolu' },
  { id: 'erzurum', name: 'Erzurum', plateCode: '25', region: 'Doğu Anadolu' },
  { id: 'hakkari', name: 'Hakkari', plateCode: '30', region: 'Doğu Anadolu' },
  { id: 'kars', name: 'Kars', plateCode: '36', region: 'Doğu Anadolu' },
  { id: 'malatya', name: 'Malatya', plateCode: '44', region: 'Doğu Anadolu' },
  { id: 'mus', name: 'Muş', plateCode: '49', region: 'Doğu Anadolu' },
  { id: 'tunceli', name: 'Tunceli', plateCode: '62', region: 'Doğu Anadolu' },
  { id: 'van', name: 'Van', plateCode: '65', region: 'Doğu Anadolu' },
  { id: 'ardahan', name: 'Ardahan', plateCode: '75', region: 'Doğu Anadolu' },
  { id: 'igdir', name: 'Iğdır', plateCode: '76', region: 'Doğu Anadolu' },
]

// Bölge renkleri
const regionColors: Record<string, string> = {
  'Marmara': '#87cdde',
  'İç Anadolu': '#ac93a7',
  'Ege': '#ffb380',
  'Akdeniz': '#cccccc',
  'Karadeniz': '#decd87',
  'Güneydoğu Anadolu': '#de8787',
  'Doğu Anadolu': '#aade87',
}

export default function TurkeyMapPanel({
  isOpen,
  onClose,
  cityPersonnel,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson
}: TurkeyMapPanelProps) {
  const [selectedCity, setSelectedCity] = useState<{ id: string; name: string; plateCode: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPerson, setEditingPerson] = useState<{ person: Person; cityName: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    phone: '',
    email: ''
  })

  // Seçili il personelleri - geriye uyumluluk için people array'ini kullan
  const selectedCityPersonnel = selectedCity
    ? cityPersonnel.find(cp => cp.city === selectedCity.name)?.people || []
    : []

  // İstatistikler - geriye uyumluluk için people array'ini kullan
  const totalPersonnel = cityPersonnel.reduce((sum, cp) => sum + (cp.people?.length || 0), 0)
  const citiesWithPersonnel = cityPersonnel.length

  // Filtrelenmiş iller
  const filteredProvinces = turkeyProvinces.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleProvinceClick = (provinceId: string) => {
    const province = turkeyProvinces.find(p => p.id === provinceId)
    if (province) {
      setSelectedCity({
        id: province.id,
        name: province.name,
        plateCode: province.plateCode
      })
      setShowAddForm(false)
      setEditingPerson(null)
    }
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCity || !formData.name || !formData.title) return

    onAddPerson(selectedCity.name, {
      name: formData.name,
      title: formData.title,
      phone: formData.phone || undefined,
      email: formData.email || undefined
    })

    setFormData({ name: '', title: '', phone: '', email: '' })
    setShowAddForm(false)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPerson) return

    onUpdatePerson(editingPerson.cityName, editingPerson.person.id, {
      name: formData.name,
      title: formData.title,
      phone: formData.phone || undefined,
      email: formData.email || undefined
    })

    setFormData({ name: '', title: '', phone: '', email: '' })
    setEditingPerson(null)
  }

  const startEdit = (person: Person, cityName: string) => {
    setEditingPerson({ person, cityName })
    setFormData({
      name: person.name,
      title: person.title || '',
      phone: person.phone || '',
      email: person.email || ''
    })
    setShowAddForm(false)
  }

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    personId: string
    cityName: string
  } | null>(null)

  const handleDelete = (personId: string, cityName: string) => {
    setConfirmationModal({ isOpen: true, personId, cityName })
  }

  // İl için personel sayısını al - geriye uyumluluk için people array'ini kullan
  const getPersonnelCount = (cityName: string) => {
    const cityData = cityPersonnel.find(cp => cp.city === cityName)
    return cityData ? (cityData.people?.length || 0) : 0
  }

  if (!isOpen) return null

  return (
    <div className="w-[500px] h-full bg-white shadow-xl flex flex-col border-r border-gray-200 relative z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-bold">Toplumsal Çalışmalar</h2>
            <p className="text-sm text-green-100">İl Temsilcileri Haritası</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-green-500 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* İstatistikler */}
      <div className="p-4 bg-green-50 border-b border-green-100 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 text-green-600">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Toplam Personel</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalPersonnel}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 text-green-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Aktif İl</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-1">{citiesWithPersonnel} / 81</p>
        </div>
      </div>

      {/* Arama */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="İl ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Harita veya İl Listesi */}
      <div className="flex-1 overflow-auto p-4">
        {searchTerm ? (
          // Arama sonuçları - Liste görünümü
          <div className="space-y-2">
            {filteredProvinces.map(province => {
              const count = getPersonnelCount(province.name)
              return (
                <button
                  key={province.id}
                  onClick={() => handleProvinceClick(province.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors flex items-center justify-between ${
                    selectedCity?.id === province.id
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div>
                    <span className="font-medium">{province.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({province.plateCode})</span>
                  </div>
                  {count > 0 && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      {count} kişi
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          // Harita görünümü - Bölgelere göre grupla
          <div className="space-y-4">
            {Object.entries(regionColors).map(([region, color]) => {
              const regionProvinces = turkeyProvinces.filter(p => p.region === region)
              return (
                <div key={region} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="font-semibold text-gray-700">{region}</h3>
                    <span className="text-xs text-gray-500">
                      ({regionProvinces.reduce((sum, p) => sum + getPersonnelCount(p.name), 0)} kişi)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {regionProvinces.map(province => {
                      const count = getPersonnelCount(province.name)
                      return (
                        <button
                          key={province.id}
                          onClick={() => handleProvinceClick(province.id)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            selectedCity?.id === province.id
                              ? 'bg-green-600 text-white'
                              : count > 0
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {province.name}
                          {count > 0 && <span className="ml-1">({count})</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Seçili İl Detayları */}
      {selectedCity && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-[40%] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{selectedCity.name}</h3>
              <p className="text-sm text-gray-500">Plaka: {selectedCity.plateCode}</p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingPerson(null)
                setFormData({ name: '', title: '', phone: '', email: '' })
              }}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Personel Ekle
            </button>
          </div>

          {/* Personel Ekleme/Düzenleme Formu */}
          {(showAddForm || editingPerson) && (
            <form 
              onSubmit={editingPerson ? handleEditSubmit : handleAddSubmit}
              className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200"
            >
              <h4 className="font-semibold text-gray-700 mb-3">
                {editingPerson ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ad Soyad *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ünvan *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  {editingPerson ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingPerson(null)
                    setFormData({ name: '', title: '', phone: '', email: '' })
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  İptal
                </button>
              </div>
            </form>
          )}

          {/* Personel Listesi */}
          {selectedCityPersonnel.length > 0 ? (
            <div className="space-y-2">
              {selectedCityPersonnel.map(person => (
                <div
                  key={person.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{person.name}</h4>
                        <p className="text-sm text-gray-500">{person.title}</p>
                        {person.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Phone className="w-3 h-3" />
                            {person.phone}
                          </div>
                        )}
                        {person.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="w-3 h-3" />
                            {person.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(person, selectedCity.name)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id, selectedCity.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !showAddForm && !editingPerson ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>Bu il için henüz personel eklenmemiş</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                İlk personeli ekle
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title="Personeli Sil"
          message="Bu personeli silmek istediğinize emin misiniz?"
          confirmText="Evet, Sil"
          cancelText="İptal"
          type="danger"
          onConfirm={() => {
            if (confirmationModal) {
              onDeletePerson(confirmationModal.cityName, confirmationModal.personId)
              showToast('Personel başarıyla silindi', 'success')
            }
            setConfirmationModal(null)
          }}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
    </div>
  )
}
