const fs = require('fs')
const path = require('path')

// CSV dosyasını oku
const csvPath = path.join(__dirname, '..', '..', 'VERİ!.csv')
const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json')

console.log('📂 CSV dosyası okunuyor:', csvPath)

// Encoding'i dene - farklı encoding'leri dene
const encodings = ['windows-1254', 'latin1', 'cp1254', 'iso-8859-9', 'utf-8']
let csvContent = null
let encodingUsed = 'utf-8'

for (const enc of encodings) {
  try {
    csvContent = fs.readFileSync(csvPath, enc)
    encodingUsed = enc
    console.log(`✅ CSV dosyası okundu (encoding: ${enc})`)
    break
  } catch (e) {
    continue
  }
}

if (!csvContent) {
  console.error('❌ CSV dosyası hiçbir encoding ile okunamadı!')
  process.exit(1)
}

// CSV satırlarını parse et
const lines = csvContent.split('\n').filter(line => line.trim())
const headers = lines[0].split(';')

console.log('📊 CSV başlıkları:', headers)

// Şehir listesi (Türkçe karakterler düzeltilmiş)
const cities = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara',
  'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman',
  'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne',
  'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane',
  'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş',
  'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli',
  'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
]

// CSV'den şehir verilerini parse et
const cityDataMap = new Map()

for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  if (!line.trim() || line.trim() === ';;;;;;') continue
  
  const columns = line.split(';').map(col => col.trim())
  
  if (columns.length < 7) continue
  
  const cityName = columns[0].trim()
  const ilSorumlusu = columns[1].trim()
  const deneyapSorumlusu = columns[2].trim()
  const ilSorumlusuUniversite = columns[3].trim()
  const ilSorumlusuBolum = columns[4].trim()
  const deneyapSorumlusuUniversite = columns[5].trim()
  const deneyapSorumlusuBolum = columns[6].trim()
  
  if (!cityName) continue
  
  // Şehir adını normalize et - Türkçe karakter dönüşümü
  let normalizedCity = cityName
  
  // Büyük harf karakter dönüşümleri (CSV'deki bozuk karakterler)
  const charMap = {
    // Kiril benzeri karakterler -> Türkçe
    'м': 'Ü', 'н': 'I', 'Ð': 'İ', 'о': 'Ş', 'а': 'Ğ', 'ж': 'Ö', 'Ч': 'Ç',
    // Küçük harf karakterler
    'ý': 'ı', 'þ': 'ş', 'ð': 'ğ', 'ý': 'ı', 'ý': 'ı',
    // Diğer bozuk karakterler
    'а': 'ğ', 'А': 'Ğ', 'м': 'ü', 'М': 'Ü', 'н': 'ı', 'Н': 'I',
    'о': 'ş', 'О': 'Ş', 'ж': 'ö', 'Ж': 'Ö', 'Ч': 'ç', 'Ч': 'Ç'
  }
  
  // Karakter dönüşümü
  for (const [wrong, correct] of Object.entries(charMap)) {
    normalizedCity = normalizedCity.replace(new RegExp(wrong, 'g'), correct)
  }
  
  // Şehir adı eşleştirme tablosu (CSV'deki bozuk isimler -> Doğru isimler)
  const cityMapping = {
    'AаRI': 'Ağrı',
    'AĞRI': 'Ağrı',
    'ADANA': 'Adana',
    'ADIYAMAN': 'Adıyaman',
    'AFYONKARAHнSAR': 'Afyonkarahisar',
    'AFYONKARAHISAR': 'Afyonkarahisar',
    'AKSARAY': 'Aksaray',
    'AMASYA': 'Amasya',
    'ANKARA': 'Ankara',
    'ANTALYA': 'Antalya',
    'ARDAHAN': 'Ardahan',
    'ARTVнN': 'Artvin',
    'ARTVIN': 'Artvin',
    'AYDIN': 'Aydın',
    'BALIKESнR': 'Balıkesir',
    'BALIKESIR': 'Balıkesir',
    'BARTIN': 'Bartın',
    'BATMAN': 'Batman',
    'BAYBURT': 'Bayburt',
    'BнLECнK': 'Bilecik',
    'BILECIK': 'Bilecik',
    'BнNGжL': 'Bingöl',
    'BINGOL': 'Bingöl',
    'BнTLнS': 'Bitlis',
    'BITLIS': 'Bitlis',
    'BOLU': 'Bolu',
    'BURDUR': 'Burdur',
    'BURSA': 'Bursa',
    'ЧANAKKALE': 'Çanakkale',
    'CANAKKALE': 'Çanakkale',
    'ЧANKIRI': 'Çankırı',
    'CANKIRI': 'Çankırı',
    'ЧORUM': 'Çorum',
    'CORUM': 'Çorum',
    'DENнZLн': 'Denizli',
    'DENIZLI': 'Denizli',
    'DмYARBAKIR': 'Diyarbakır',
    'DIYARBAKIR': 'Diyarbakır',
    'DмZCE': 'Düzce',
    'DUZCE': 'Düzce',
    'EDнRNE': 'Edirne',
    'EDIRNE': 'Edirne',
    'ELAZIа': 'Elazığ',
    'ELAZIG': 'Elazığ',
    'ERZнNCAN': 'Erzincan',
    'ERZINCAN': 'Erzincan',
    'ERZURUM': 'Erzurum',
    'ESKноEHнR': 'Eskişehir',
    'ESKISEHIR': 'Eskişehir',
    'GAZнANTEP': 'Gaziantep',
    'GAZIANTEP': 'Gaziantep',
    'GнRESUN': 'Giresun',
    'GIRESUN': 'Giresun',
    'GмMмоHANE': 'Gümüşhane',
    'GUMUSHANE': 'Gümüşhane',
    'HAKKARн': 'Hakkari',
    'HAKKARI': 'Hakkari',
    'HATAY': 'Hatay',
    'IаDIR': 'Iğdır',
    'IGDIR': 'Iğdır',
    'ISPARTA': 'Isparta',
    'нSTANBUL': 'İstanbul',
    'ISTANBUL': 'İstanbul',
    'нZMнR': 'İzmir',
    'IZMIR': 'İzmir',
    'KAHRAMANMARAо': 'Kahramanmaraş',
    'KAHRAMANMARAS': 'Kahramanmaraş',
    'KARABмK': 'Karabük',
    'KARABUK': 'Karabük',
    'KARAMAN': 'Karaman',
    'KARS': 'Kars',
    'KASTAMONU': 'Kastamonu',
    'KAYSERн': 'Kayseri',
    'KAYSERI': 'Kayseri',
    'KIRIKKALE': 'Kırıkkale',
    'KIRKLARELн': 'Kırklareli',
    'KIRKLARELI': 'Kırklareli',
    'KIRоEHнR': 'Kırşehir',
    'KIRSEHIR': 'Kırşehir',
    'KнLнS': 'Kilis',
    'KILIS': 'Kilis',
    'KOCAELн': 'Kocaeli',
    'KOCAELI': 'Kocaeli',
    'KONYA': 'Konya',
    'KмTAHYA': 'Kütahya',
    'KUTAHYA': 'Kütahya',
    'MALATYA': 'Malatya',
    'MANнSA': 'Manisa',
    'MANISA': 'Manisa',
    'MARDнN': 'Mardin',
    'MARDIN': 'Mardin',
    'MERSнN': 'Mersin',
    'MERSIN': 'Mersin',
    'MUаLA': 'Muğla',
    'MUGLA': 'Muğla',
    'MUо': 'Muş',
    'MUS': 'Muş',
    'NEVоEHнR': 'Nevşehir',
    'NEVSEHIR': 'Nevşehir',
    'NнаDE': 'Niğde',
    'NIGDE': 'Niğde',
    'ORDU': 'Ordu',
    'OSMANнYE': 'Osmaniye',
    'OSMANIYE': 'Osmaniye',
    'RнZE': 'Rize',
    'RIZE': 'Rize',
    'SAKARYA': 'Sakarya',
    'SAMSUN': 'Samsun',
    'SннRT': 'Siirt',
    'SIIRT': 'Siirt',
    'SнNOP': 'Sinop',
    'SINOP': 'Sinop',
    'SнVAS': 'Sivas',
    'SIVAS': 'Sivas',
    'оANLIURFA': 'Şanlıurfa',
    'SANLIURFA': 'Şanlıurfa',
    'оIRNAK': 'Şırnak',
    'SIRNAK': 'Şırnak',
    'TEKнRDAа': 'Tekirdağ',
    'TEKIRDAG': 'Tekirdağ',
    'TOKAT': 'Tokat',
    'TRABZON': 'Trabzon',
    'TUNCELн': 'Tunceli',
    'TUNCELI': 'Tunceli',
    'UоAK': 'Uşak',
    'USAK': 'Uşak',
    'VAN': 'Van',
    'YALOVA': 'Yalova',
    'YOZGAT': 'Yozgat',
    'ZONGULDAK': 'Zonguldak'
  }
  
  // Önce karakter dönüşümü yap
  normalizedCity = normalizedCity.trim().toUpperCase()
  
  // Sonra şehir adı eşleştirmesi yap
  if (cityMapping[normalizedCity]) {
    normalizedCity = cityMapping[normalizedCity]
  } else {
    // Eşleştirme yoksa karakterleri düzeltip ilk harfi büyük yap
    normalizedCity = normalizedCity
      .replace(/Ý/g, 'I')
      .replace(/Ð/g, 'I')
      .replace(/Þ/g, 'S')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    // Özel Türkçe karakter düzeltmeleri
    normalizedCity = normalizedCity
      .replace(/i/g, 'ı').replace(/I/g, 'I')  // Bu mantıklı değil, farklı yaklaşım gerekli
  }
  
  // Özel durumlar için ek kontrol - CSV'deki bozuk adları düzelt
  const specialCases = {
    'AаRI': 'Ağrı',
    'AĞRI': 'Ağrı',
    'AGRI': 'Ağrı',
    'AFYONKARAHнSAR': 'Afyonkarahisar',
    'AFYONKARAHISAR': 'Afyonkarahisar',
    'AFYON': 'Afyonkarahisar',
    'ADIYAMAN': 'Adıyaman',
    'ADıYAMAN': 'Adıyaman',
    'ADнYAMAN': 'Adıyaman',
    'Afyonkarahýsar': 'Afyonkarahisar',
    'Aðri': 'Ağrı',
    'AĞRı': 'Ağrı'
  }
  
  // Önce özel durumları kontrol et
  for (const [wrong, correct] of Object.entries(specialCases)) {
    if (normalizedCity.includes(wrong) || normalizedCity.toUpperCase().includes(wrong.toUpperCase())) {
      normalizedCity = correct
      break
    }
  }
  
  // Kocaeli alt şehirleri için özel kontrol
  if (normalizedCity.toUpperCase().includes('KOCAELI') || normalizedCity.toUpperCase().includes('KOCAELн')) {
    if (normalizedCity.toUpperCase().includes('GEBZE')) {
      normalizedCity = 'Kocaeli (Gebze)'
    } else if (normalizedCity.toUpperCase().includes('IZMIT') || normalizedCity.toUpperCase().includes('нZMнT')) {
      normalizedCity = 'Kocaeli (İzmit)'
    } else {
      normalizedCity = 'Kocaeli'
    }
  } else if (normalizedCity.toUpperCase().includes('SAKARYA')) {
    if (normalizedCity.toUpperCase().includes('ADAPAZARI')) {
      normalizedCity = 'Sakarya (Adapazarı)'
    } else {
      normalizedCity = 'Sakarya'
    }
  }
  
  const cityData = {
    city: normalizedCity,
    ilSorumlusu: ilSorumlusu || null,
    deneyapSorumlusu: deneyapSorumlusu || null,
    ilSorumlusuUniversite: ilSorumlusuUniversite || null,
    ilSorumlusuBolum: ilSorumlusuBolum || null,
    deneyapSorumlusuUniversite: deneyapSorumlusuUniversite || null,
    deneyapSorumlusuBolum: deneyapSorumlusuBolum || null
  }
  
  cityDataMap.set(normalizedCity, cityData)
}

console.log(`\n✅ ${cityDataMap.size} şehir verisi parse edildi`)

// org.json dosyasını oku
console.log('\n📖 org.json dosyası okunuyor...')
const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf-8'))

// Mevcut cityPersonnel'i al veya oluştur
let cityPersonnel = orgData.cityPersonnel || []

// ID generator
function generateId(prefix = 'city') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generatePersonId() {
  return `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// İsimleri normalize et (kiril karakterleri düzelt)
function normalizeName(name) {
  if (!name) return name
  return name
    .replace(/м/g, 'Ü')
    .replace(/н/g, 'I')
    .replace(/Ð/g, 'İ')
    .replace(/о/g, 'Ş')
    .replace(/а/g, 'Ğ')
    .replace(/ý/g, 'ı')
    .replace(/þ/g, 'ş')
    .replace(/ð/g, 'ğ')
    .replace(/ж/g, 'Ö')
    .replace(/м/g, 'Ü')
    .replace(/Ч/g, 'Ç')
    .replace(/м/g, 'Ü')
    .trim()
    .toUpperCase()
}

function normalizeText(text) {
  if (!text) return text
  return text
    .replace(/м/g, 'Ü')
    .replace(/н/g, 'I')
    .replace(/Ð/g, 'İ')
    .replace(/о/g, 'Ş')
    .replace(/а/g, 'Ğ')
    .replace(/ý/g, 'ı')
    .replace(/þ/g, 'ş')
    .replace(/ð/g, 'ğ')
    .replace(/ж/g, 'Ö')
    .replace(/Ч/g, 'Ç')
    .trim()
}

  // Şehir verilerini güncelle
const updatedCities = new Set()
const newCities = []

// Şehir adı normalizasyonu için helper
function normalizeCityNameForSearch(cityName) {
  return cityName
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

cityDataMap.forEach((csvData, cityName) => {
  // Mevcut şehri bul (normalize edilmiş karşılaştırma ile)
  const normalizedCityName = normalizeCityNameForSearch(cityName)
  const existingCity = cityPersonnel.find(cp => {
    const normalizedExisting = normalizeCityNameForSearch(cp.city)
    return normalizedExisting === normalizedCityName || 
           normalizedExisting.includes(normalizedCityName) || 
           normalizedCityName.includes(normalizedExisting)
  })
  
  const cityEntry = existingCity || {
    id: generateId(),
    city: cityName,
    people: []
  }
  
  // İl Sorumlusu güncelle
  if (csvData.ilSorumlusu) {
    cityEntry.ilSorumlusu = {
      id: existingCity?.ilSorumlusu?.id || generatePersonId(),
      name: normalizeName(csvData.ilSorumlusu),
      title: 'İl Sorumlusu'
    }
    
    if (csvData.ilSorumlusuUniversite) {
      cityEntry.ilSorumlusu.university = normalizeText(csvData.ilSorumlusuUniversite)
    }
    
    if (csvData.ilSorumlusuBolum) {
      cityEntry.ilSorumlusu.department = normalizeText(csvData.ilSorumlusuBolum)
    }
  }
  
  // Deneyap Sorumlusu güncelle
  if (csvData.deneyapSorumlusu) {
    cityEntry.deneyapSorumlusu = {
      id: existingCity?.deneyapSorumlusu?.id || generatePersonId(),
      name: normalizeName(csvData.deneyapSorumlusu),
      title: 'Deneyap Sorumlusu'
    }
    
    if (csvData.deneyapSorumlusuUniversite) {
      cityEntry.deneyapSorumlusu.university = normalizeText(csvData.deneyapSorumlusuUniversite)
    }
    
    if (csvData.deneyapSorumlusuBolum) {
      cityEntry.deneyapSorumlusu.department = normalizeText(csvData.deneyapSorumlusuBolum)
    }
  }
  
  if (existingCity) {
    const index = cityPersonnel.indexOf(existingCity)
    cityPersonnel[index] = cityEntry
    updatedCities.add(cityName)
  } else {
    cityPersonnel.push(cityEntry)
    newCities.push(cityName)
  }
})

// org.json'ı güncelle
orgData.cityPersonnel = cityPersonnel.sort((a, b) => a.city.localeCompare(b.city, 'tr'))

console.log(`\n📊 Güncelleme Özeti:`)
console.log(`  ✅ Güncellenen şehirler: ${updatedCities.size}`)
console.log(`  ➕ Yeni eklenen şehirler: ${newCities.length}`)
console.log(`  📈 Toplam şehir sayısı: ${cityPersonnel.length}`)

// Dosyaya kaydet
fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf-8')
console.log(`\n✅ org.json güncellendi: ${orgJsonPath}`)

// Örnek çıktı
console.log(`\n📋 Örnek veriler:`)
const sampleCities = cityPersonnel.slice(0, 5)
sampleCities.forEach(city => {
  console.log(`\n  Şehir: ${city.city}`)
  if (city.ilSorumlusu) {
    console.log(`    İl Sorumlusu: ${city.ilSorumlusu.name}`)
    if (city.ilSorumlusu.university) console.log(`      Üniversite: ${city.ilSorumlusu.university}`)
  }
  if (city.deneyapSorumlusu) {
    console.log(`    Deneyap Sorumlusu: ${city.deneyapSorumlusu.name}`)
    if (city.deneyapSorumlusu.university) console.log(`      Üniversite: ${city.deneyapSorumlusu.university}`)
  }
})

console.log(`\n🎉 Tamamlandı!`)
