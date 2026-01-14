const fs = require('fs')
const path = require('path')

// org.json dosya yolu
const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json')

// Yedek oluştur
const backupPath = orgJsonPath + `.backup.${Date.now()}`
fs.copyFileSync(orgJsonPath, backupPath)
console.log(`✅ Yedek oluşturuldu: ${backupPath}`)

// org.json'ı oku
const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf-8'))

// Güncellenecek kişiler ve linkleri
const updates = [
  {
    name: 'Ahmet Bozdoğan',
    link: 'https://docs.google.com/spreadsheets/d/1cfCKNANJ3O-bGutTdmO_czNtgXreHBiR/edit?usp=sharing&ouid=102371716258983552666&rtpof=true&sd=true'
  },
  {
    name: 'Büşra Çiftçioğlu',
    link: 'https://docs.google.com/spreadsheets/d/1pmXZk58HI42xUf6_F_3PECCTbVaT-T6C/edit?usp=sharing&ouid=102371716258983552666&rtpof=true&sd=true'
  },
  {
    name: 'Gizem Karabacak',
    link: 'https://docs.google.com/spreadsheets/d/1ygxlApSZ_VFIqALA1oSzlaDf4vwLJmUJ/edit?usp=sharing&ouid=102371716258983552666&rtpof=true&sd=true'
  },
  {
    name: 'İrem Bayraktar Aksakal',
    link: 'https://docs.google.com/spreadsheets/d/1c6eW6WCJ9DX48QnQodij2miWZIWHKL_v/edit?usp=sharing&ouid=102371716258983552666&rtpof=true&sd=true'
  },
  {
    name: 'Nurkan Karabulut',
    link: 'https://docs.google.com/spreadsheets/d/15fnOaNxE-yOVK-h-RKnkp3FlYwN8t5i-/edit?usp=sharing&ouid=102371716258983552666&rtpof=true&sd=true'
  }
]

// İsim normalizasyon fonksiyonu
function normalizeName(name) {
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'C')
}

// Person bulma fonksiyonu
function findPerson(searchName) {
  const normalizedSearch = normalizeName(searchName)
  
  // Coordinators içinde ara
  for (const coord of orgData.coordinators || []) {
    // Coordinator kendisi
    if (coord.coordinator && coord.coordinator.name) {
      const normalized = normalizeName(coord.coordinator.name)
      if (normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
        return {
          type: 'coordinator',
          path: `${coord.id}.coordinator`,
          person: coord.coordinator
        }
      }
    }
    
    // Deputies
    if (coord.deputies) {
      for (const deputy of coord.deputies) {
        if (deputy.name) {
          const normalized = normalizeName(deputy.name)
          if (normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
            return {
              type: 'deputy',
              path: `${coord.id}.deputies.${deputy.id}`,
              person: deputy
            }
          }
        }
      }
    }
    
    // SubUnits içindeki people
    if (coord.subUnits) {
      for (const subUnit of coord.subUnits) {
        if (subUnit.people) {
          for (const person of subUnit.people) {
            if (person.name) {
              const normalized = normalizeName(person.name)
              if (normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
                return {
                  type: 'subunit-person',
                  path: `${coord.id}.subUnits.${subUnit.id}.people`,
                  person: person
                }
              }
            }
          }
        }
      }
    }
    
    // Direct people
    if (coord.people) {
      for (const person of coord.people) {
        if (person.name) {
          const normalized = normalizeName(person.name)
          if (normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
            return {
              type: 'direct-person',
              path: `${coord.id}.people`,
              person: person
            }
          }
        }
      }
    }
  }
  
  // Main coordinators içinde ara
  for (const mainCoord of orgData.mainCoordinators || []) {
    if (mainCoord.coordinator && mainCoord.coordinator.name) {
      const normalized = normalizeName(mainCoord.coordinator.name)
      if (normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
        return {
          type: 'mainCoordinator',
          path: `${mainCoord.id}.coordinator`,
          person: mainCoord.coordinator
        }
      }
    }
  }
  
  // Management içinde ara
  for (const mgmt of orgData.management || []) {
    if (mgmt.name) {
      const normalized = normalizeName(mgmt.name)
      if (normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized)) {
        return {
          type: 'management',
          path: `management.${mgmt.id}`,
          person: mgmt
        }
      }
    }
  }
  
  return null
}

// Güncellemeleri yap
let successCount = 0
let failCount = 0

console.log('\n═══════════════════════════════════════════════════════════')
console.log('🔧 GÖREV TANIMI LİNK GÜNCELLEMELERİ')
console.log('═══════════════════════════════════════════════════════════\n')

for (const update of updates) {
  console.log(`🔍 "${update.name}" aranıyor...`)
  
  const found = findPerson(update.name)
  
  if (!found) {
    console.warn(`⚠️  "${update.name}" bulunamadı!`)
    failCount++
    continue
  }
  
  console.log(`✅ Bulundu: ${found.type} - ${found.path}`)
  
  // jobDescriptionLink'i güncelle
  found.person.jobDescriptionLink = update.link
  
  console.log(`   ✅ Görev tanımı linki güncellendi`)
  successCount++
}

// org.json'ı kaydet
fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf-8')

console.log(`\n═══════════════════════════════════════════════════════════`)
console.log(`✅ Başarılı: ${successCount}`)
console.log(`⚠️  Başarısız: ${failCount}`)
console.log(`═══════════════════════════════════════════════════════════\n`)
