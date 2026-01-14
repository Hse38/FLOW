// PERS.xlsx'ten personel bilgilerini güncelleme scripti
// Çalışma süresi, link, üniversite, bölüm vb. tüm bilgileri günceller
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')
const { initializeApp } = require('firebase/app')
const { getDatabase, ref, set } = require('firebase/database')

const firebaseConfig = {
  apiKey: "AIzaSyCrSbdQZSFd8VYWW8a-h2ToNs6FJSHZdXc",
  authDomain: "t3-vakfi-org.firebaseapp.com",
  databaseURL: "https://t3-vakfi-org-default-rtdb.firebaseio.com",
  projectId: "t3-vakfi-org",
  storageBucket: "t3-vakfi-org.firebasestorage.app",
  messagingSenderId: "218972745568",
  appId: "1:218972745568:web:4626c4ff1e03e9da323805",
  measurementId: "G-X2TN72QCF1"
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

const excelPath = path.join(__dirname, '..', 'PERS.xlsx')
const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json')
const projectId = 'main'

// İsimleri normalize et (karşılaştırma için)
function normalizeNameForSearch(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// Personeli bul (isim ile)
function findPerson(orgData, searchName) {
  if (!searchName) return null
  
  const normalizedSearch = normalizeNameForSearch(searchName)
  
  // Tüm koordinatörlerde ara
  if (orgData.coordinators) {
    for (const coordinator of orgData.coordinators) {
      // Koordinatör kendisi
      if (coordinator.coordinator && coordinator.coordinator.name) {
        const normalized = normalizeNameForSearch(coordinator.coordinator.name)
        if (normalized === normalizedSearch || 
            normalized.includes(normalizedSearch) || 
            normalizedSearch.includes(normalized)) {
          return { type: 'coordinator', coordinator, person: coordinator.coordinator, path: 'coordinator' }
        }
      }
      
      // Yardımcılar
      if (coordinator.deputies) {
        for (let i = 0; i < coordinator.deputies.length; i++) {
          const deputy = coordinator.deputies[i]
          if (deputy.name) {
            const normalized = normalizeNameForSearch(deputy.name)
            if (normalized === normalizedSearch || 
                normalized.includes(normalizedSearch) || 
                normalizedSearch.includes(normalized)) {
              return { type: 'deputy', coordinator, person: deputy, path: `deputies[${i}]` }
            }
          }
        }
      }
      
      // Alt birim personeli
      if (coordinator.subUnits) {
        for (let subIdx = 0; subIdx < coordinator.subUnits.length; subIdx++) {
          const subUnit = coordinator.subUnits[subIdx]
          if (subUnit.people) {
            for (let pIdx = 0; pIdx < subUnit.people.length; pIdx++) {
              const person = subUnit.people[pIdx]
              if (person.name) {
                const normalized = normalizeNameForSearch(person.name)
                if (normalized === normalizedSearch || 
                    normalized.includes(normalizedSearch) || 
                    normalizedSearch.includes(normalized)) {
                  return { 
                    type: 'subunit', 
                    coordinator, 
                    subUnit, 
                    person, 
                    path: `subUnits[${subIdx}].people[${pIdx}]` 
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Executives'de ara
  if (orgData.executives) {
    for (let i = 0; i < orgData.executives.length; i++) {
      const exec = orgData.executives[i]
      if (exec.name) {
        const normalized = normalizeNameForSearch(exec.name)
        if (normalized === normalizedSearch || 
            normalized.includes(normalizedSearch) || 
            normalizedSearch.includes(normalized)) {
          return { type: 'executive', person: exec, path: `executives[${i}]` }
        }
      }
    }
  }
  
  // City Personnel'de ara
  if (orgData.cityPersonnel) {
    for (const city of orgData.cityPersonnel) {
      if (city.ilSorumlusu && city.ilSorumlusu.name) {
        const normalized = normalizeNameForSearch(city.ilSorumlusu.name)
        if (normalized === normalizedSearch || 
            normalized.includes(normalizedSearch) || 
            normalizedSearch.includes(normalized)) {
          return { type: 'city', city, person: city.ilSorumlusu, path: 'ilSorumlusu' }
        }
      }
      if (city.deneyapSorumlusu && city.deneyapSorumlusu.name) {
        const normalized = normalizeNameForSearch(city.deneyapSorumlusu.name)
        if (normalized === normalizedSearch || 
            normalized.includes(normalizedSearch) || 
            normalizedSearch.includes(normalized)) {
          return { type: 'city', city, person: city.deneyapSorumlusu, path: 'deneyapSorumlusu' }
        }
      }
    }
  }
  
  return null
}

// Personel bilgilerini güncelle
function updatePersonInfo(orgData, excelRow) {
  // Excel kolonlarını normalize et (farklı isimleri kabul et)
  const name = excelRow['İsim'] || excelRow['İSİM'] || excelRow['isim'] || excelRow['İsim/Name'] || excelRow['Name'] || excelRow['name'] || excelRow['Ad Soyad'] || excelRow['AD SOYAD'] || ''
  const title = excelRow['Ünvan'] || excelRow['ÜNVAN'] || excelRow['ünvan'] || excelRow['Title'] || excelRow['title'] || excelRow['Pozisyon'] || excelRow['pozisyon'] || ''
  const email = excelRow['Email'] || excelRow['EMAIL'] || excelRow['email'] || excelRow['E-Posta'] || excelRow['E-posta'] || excelRow['e-posta'] || ''
  const phone = excelRow['Telefon'] || excelRow['TELEFON'] || excelRow['telefon'] || excelRow['Phone'] || excelRow['phone'] || excelRow['Tel'] || excelRow['tel'] || ''
  const university = excelRow['Üniversite'] || excelRow['ÜNİVERSİTE'] || excelRow['üniversite'] || excelRow['University'] || excelRow['university'] || excelRow['Okul'] || excelRow['okul'] || ''
  const department = excelRow['Bölüm'] || excelRow['BÖLÜM'] || excelRow['bölüm'] || excelRow['Department'] || excelRow['department'] || excelRow['Departman'] || excelRow['departman'] || ''
  const yearsOfService = excelRow['Çalışma Süresi'] || excelRow['ÇALIŞMA SÜRESİ'] || excelRow['çalışma süresi'] || excelRow['Years of Service'] || excelRow['yearsOfService'] || excelRow['Süre'] || excelRow['süre'] || ''
  const personalLink = excelRow['Link'] || excelRow['LİNK'] || excelRow['link'] || excelRow['Kişisel Link'] || excelRow['Personal Link'] || excelRow['personalLink'] || excelRow['URL'] || excelRow['url'] || ''
  const startDate = excelRow['İşe Giriş Tarihi'] || excelRow['İŞE GİRİŞ TARİHİ'] || excelRow['işe giriş tarihi'] || excelRow['Start Date'] || excelRow['startDate'] || excelRow['Giriş Tarihi'] || excelRow['giriş tarihi'] || excelRow['Başlangıç Tarihi'] || excelRow['başlangıç tarihi'] || ''
  const jobDescriptionLinks = excelRow['Görev Tanımı Linkleri'] || excelRow['GÖREV TANIMI LİNKLERİ'] || excelRow['görev tanımı linkleri'] || excelRow['Job Description Links'] || excelRow['jobDescriptionLinks'] || excelRow['Görev Linkleri'] || excelRow['görev linkleri'] || excelRow['Görev Tanım Linki'] || excelRow['görev tanım linki'] || ''
  const jobDescription = excelRow['Görev Tanımı'] || excelRow['GÖREV TANIMI'] || excelRow['görev tanımı'] || excelRow['Job Description'] || excelRow['jobDescription'] || excelRow['Görevler'] || excelRow['görevler'] || excelRow['İş Tanımı'] || excelRow['iş tanımı'] || ''
  const notes = excelRow['Notlar'] || excelRow['NOTLAR'] || excelRow['notlar'] || excelRow['Notes'] || excelRow['notes'] || excelRow['Not'] || excelRow['not'] || ''
  
  if (!name || !name.trim()) {
    return false
  }
  
  console.log(`\n🔍 "${name.trim()}" aranıyor...`)
  
  // Personi bul
  const found = findPerson(orgData, name.trim())
  
  if (!found) {
    console.warn(`⚠️  "${name.trim()}" bulunamadı!`)
    return false
  }
  
  console.log(`✅ Bulundu: ${found.type} - ${found.path}`)
  
  // Güncellemeleri yap
  const updates = []
  
  if (title && title.trim()) {
    found.person.title = title.trim()
    updates.push('ünvan')
  }
  
  if (email && email.trim()) {
    found.person.email = email.trim()
    updates.push('email')
  }
  
  if (phone && phone.trim()) {
    found.person.phone = phone.trim()
    updates.push('telefon')
  }
  
  if (university && university.trim()) {
    found.person.university = university.trim()
    updates.push('üniversite')
  }
  
  if (department && department.trim()) {
    found.person.department = department.trim()
    updates.push('bölüm')
  }
  
  if (yearsOfService && yearsOfService.trim()) {
    found.person.yearsOfService = yearsOfService.trim()
    updates.push('çalışma süresi')
  }
  
  if (personalLink && personalLink.trim()) {
    found.person.personalLink = personalLink.trim()
    updates.push('link')
  }
  
  if (startDate && startDate.trim()) {
    found.person.startDate = startDate.trim()
    updates.push('işe giriş tarihi')
  }
  
  if (jobDescriptionLinks && jobDescriptionLinks.trim()) {
    // Eğer virgülle ayrılmış linkler varsa array'e çevir
    const links = jobDescriptionLinks.trim().split(',').map(link => link.trim()).filter(link => link)
    found.person.jobDescriptionLinks = links.length > 1 ? links : links[0] || jobDescriptionLinks.trim()
    updates.push('görev tanımı linkleri')
  }
  
  if (jobDescription && jobDescription.trim()) {
    found.person.jobDescription = jobDescription.trim()
    updates.push('görev tanımı')
  }
  
  if (notes && notes.trim()) {
    found.person.notes = notes.trim()
    updates.push('notlar')
  }
  
  if (updates.length > 0) {
    console.log(`   ✅ Güncellendi: ${updates.join(', ')}`)
    return true
  } else {
    console.log(`   ℹ️  Güncellenecek bilgi yok`)
    return false
  }
}

async function main() {
  try {
    console.log('🚀 PERSONEL BİLGİLERİ GÜNCELLEME BAŞLIYOR...\n')
    
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ Excel dosyası bulunamadı: ${excelPath}`)
      process.exit(1)
    }
    
    // Excel'i oku
    console.log('📂 Excel dosyası okunuyor...')
    const workbook = XLSX.readFile(excelPath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const excelData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    
    console.log(`✅ Excel okundu: ${sheetName} sayfası`)
    console.log(`📋 Toplam satır: ${excelData.length}`)
    
    if (excelData.length > 0) {
      const columns = Object.keys(excelData[0])
      console.log(`📋 Kolonlar (${columns.length} adet):`)
      columns.forEach((col, i) => {
        console.log(`   ${(i+1).toString().padStart(2, ' ')}. ${col}`)
      })
    }
    
    // org.json'ı oku
    console.log('\n📥 org.json dosyası okunuyor...')
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'))
    console.log('✅ org.json okundu')
    
    // Yedekleme
    const backupPath = path.join(__dirname, '..', 'data', `org.json.backup.${Date.now()}`)
    fs.copyFileSync(orgJsonPath, backupPath)
    console.log(`💾 Yedek oluşturuldu: ${backupPath}`)
    
    // Her satırı işle
    console.log(`\n🔄 ${excelData.length} personel bilgisi güncelleniyor...\n`)
    
    let successCount = 0
    let failCount = 0
    
    for (const row of excelData) {
      if (updatePersonInfo(orgData, row)) {
        successCount++
      } else {
        failCount++
      }
    }
    
    // org.json'ı kaydet
    fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf8')
    console.log('\n✅ org.json güncellendi!')
    
    // Firebase'e yaz
    console.log('\n📤 Firebase\'e yazılıyor...')
    await set(ref(database, `orgData/${projectId}`), orgData)
    console.log('✅ Firebase\'e yazıldı!')
    
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log(`✅✅✅ GÜNCELLEME TAMAMLANDI! ✅✅✅`)
    console.log(`   ✅ Başarılı: ${successCount}`)
    console.log(`   ❌ Başarısız: ${failCount}`)
    console.log(`═══════════════════════════════════════════════════════════`)
    console.log(`\n💾 org.json: ${orgJsonPath}`)
    console.log(`📤 Firebase: orgData/${projectId}`)
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ HATA:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
