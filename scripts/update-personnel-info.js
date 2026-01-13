/**
 * Personel Bilgileri ve CV Yükleme Scripti
 * 
 * Bu script, personel bilgilerini (email, telefon, üniversite, bölüm, CV vb.) 
 * CSV veya JSON dosyasından okuyup org.json'a ekler.
 * 
 * CSV Format Örneği:
 * İsim,Email,Telefon,Üniversite,Bölüm,CV_Dosya_Yolu,Notlar
 * "Ahmet Yılmaz","ahmet@example.com","0532 123 45 67","İTÜ","Bilgisayar Mühendisliği","cv/ahmet-yilmaz.pdf",""
 * 
 * JSON Format Örneği:
 * [
 *   {
 *     "name": "Ahmet Yılmaz",
 *     "email": "ahmet@example.com",
 *     "phone": "0532 123 45 67",
 *     "university": "İTÜ",
 *     "department": "Bilgisayar Mühendisliği",
 *     "cvFilePath": "cv/ahmet-yilmaz.pdf",
 *     "notes": ""
 *   }
 * ]
 */

const fs = require('fs')
const path = require('path')

// Excel okuma için xlsx kütüphanesi (yoksa basit CSV parse kullan)
let XLSX = null
try {
  XLSX = require('xlsx')
} catch (e) {
  console.warn('⚠️  xlsx kütüphanesi bulunamadı. CSV formatı kullanılacak.')
  console.warn('   Excel için: npm install xlsx')
}

// Dosya yolları
const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json')

// CV dosyalarının bulunacağı klasör (isteğe bağlı)
const cvFolderPath = path.join(__dirname, '..', 'cv-files')

console.log('📋 Personel Bilgileri Güncelleme Scripti')
console.log('═══════════════════════════════════════════════════════════\n')

// org.json'ı oku
let orgData
try {
  orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf-8'))
  console.log('✅ org.json dosyası okundu')
} catch (error) {
  console.error('❌ org.json dosyası okunamadı:', error.message)
  process.exit(1)
}

/**
 * CV dosyasını Base64'e çevir
 */
function encodeCVFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  CV dosyası bulunamadı: ${filePath}`)
      return null
    }
    
    const fileContent = fs.readFileSync(filePath)
    const base64 = fileContent.toString('base64')
    const fileExtension = path.extname(filePath).toLowerCase()
    
    // MIME type belirleme
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    }
    
    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream'
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error(`❌ CV dosyası okunamadı (${filePath}):`, error.message)
    return null
  }
}

/**
 * İsimleri normalize et (karşılaştırma için)
 */
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

/**
 * Personeli bul (isim, email veya ID ile) - Geliştirilmiş eşleştirme
 */
function findPerson(personData, searchKey, searchValue) {
  if (!searchValue) return null
  
  const normalizedSearch = normalizeNameForSearch(searchValue)
  
  // Tüm koordinatörlerde ara
  if (orgData.coordinators) {
    for (const coordinator of orgData.coordinators) {
      // Koordinatör kendisi
      if (coordinator.coordinator && searchKey === 'name' && coordinator.coordinator.name) {
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
          if (deputy[searchKey] && searchKey === 'name') {
            const normalized = normalizeNameForSearch(deputy[searchKey])
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
              if (person[searchKey] && searchKey === 'name') {
                const normalized = normalizeNameForSearch(person[searchKey])
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
  
  // City Personnel'de ara
  if (orgData.cityPersonnel) {
    for (const city of orgData.cityPersonnel) {
      if (city.ilSorumlusu && city.ilSorumlusu[searchKey] && searchKey === 'name') {
        const normalized = normalizeNameForSearch(city.ilSorumlusu[searchKey])
        if (normalized === normalizedSearch || 
            normalized.includes(normalizedSearch) || 
            normalizedSearch.includes(normalized)) {
          return { type: 'city', city, person: city.ilSorumlusu, path: 'ilSorumlusu' }
        }
      }
      if (city.deneyapSorumlusu && city.deneyapSorumlusu[searchKey] && searchKey === 'name') {
        const normalized = normalizeNameForSearch(city.deneyapSorumlusu[searchKey])
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

/**
 * Personel bilgilerini güncelle
 */
function updatePersonInfo(personData) {
  const { name, email, phone, university, department, cvFilePath, photoFilePath, notes, jobDescription } = personData
  
  if (!name) {
    console.warn('⚠️  İsim bulunamadı, atlanıyor')
    return false
  }
  
  console.log(`\n🔍 "${name}" aranıyor...`)
  
  // Personi bul
  const found = findPerson(personData, 'name', name)
  
  if (!found) {
    console.warn(`⚠️  "${name}" bulunamadı!`)
    return false
  }
  
  console.log(`✅ Bulundu: ${found.type} - ${found.path}`)
  
  // Güncellemeleri yap
  const updates = {}
  
  if (email) {
    found.person.email = email
    updates.email = email
  }
  
  if (phone) {
    found.person.phone = phone
    updates.phone = phone
  }
  
  if (university) {
    found.person.university = university
    updates.university = university
  }
  
  if (department) {
    found.person.department = department
    updates.department = department
  }
  
  if (notes) {
    found.person.notes = notes
    updates.notes = notes
  }
  
  if (jobDescription) {
    found.person.jobDescription = jobDescription
    updates.jobDescription = jobDescription
  }
  
  // CV yükle
  if (cvFilePath && cvFilePath.trim() && cvFilePath.trim().toUpperCase() !== 'YOK') {
    // Excel'deki CV yolu genellikle sadece dosya adıdır (örn: "Bahar Kılıç - Bahar Kılıç.pdf")
    // Önce tam yol olarak dene
    let fullPath = cvFilePath.trim()
    let foundPath = null
    
    // Eğer göreli yol ise, proje kök dizinine göre dene
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(__dirname, '..', fullPath)
    }
    
    // İlk olarak tam yolu kontrol et
    if (fs.existsSync(fullPath)) {
      foundPath = fullPath
    } else {
      // Dosya adını çıkar (Excel'deki yol genellikle sadece dosya adıdır)
      const fileName = path.basename(cvFilePath.trim())
      
      // cv-files klasöründe arama yap
      const cvFilesDir = path.join(__dirname, '..', 'cv-files')
      const cvDir = path.join(__dirname, '..', 'cv')
      const rootDir = path.join(__dirname, '..')
      
      // Arama yapılacak klasörler
      const searchDirs = [cvFilesDir, cvDir, rootDir]
      
      // Dosya adını normalize et (boşlukları ve özel karakterleri)
      const normalizedFileName = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '')
      
      for (const searchDir of searchDirs) {
        if (fs.existsSync(searchDir)) {
          // Klasördeki tüm dosyaları listele
          try {
            const files = fs.readdirSync(searchDir)
            
            // Tam eşleşme ara
            for (const file of files) {
              if (file === fileName || 
                  file.toLowerCase() === fileName.toLowerCase() ||
                  path.basename(file, path.extname(file)).toLowerCase() === 
                  path.basename(fileName, path.extname(fileName)).toLowerCase()) {
                foundPath = path.join(searchDir, file)
                break
              }
            }
            
            // Eğer bulunamadıysa, normalize edilmiş isimle ara
            if (!foundPath) {
              for (const file of files) {
                const normalizedFile = file.toLowerCase().replace(/[^a-z0-9._-]/g, '')
                if (normalizedFile === normalizedFileName || 
                    normalizedFile.includes(normalizedFileName.substring(0, 10)) ||
                    normalizedFileName.includes(normalizedFile.substring(0, 10))) {
                  foundPath = path.join(searchDir, file)
                  break
                }
              }
            }
            
            if (foundPath) break
          } catch (err) {
            // Klasör okuma hatası, devam et
          }
        }
      }
    }
    
    if (foundPath && fs.existsSync(foundPath)) {
      const cvData = encodeCVFile(foundPath)
      if (cvData) {
        found.person.cvData = cvData
        found.person.cvFileName = path.basename(foundPath)
        updates.cvFileName = found.person.cvFileName
        console.log(`   📄 CV yüklendi: ${found.person.cvFileName}`)
      } else {
        console.warn(`   ⚠️  CV dosyası okunamadı: ${foundPath}`)
      }
    } else {
      console.warn(`   ⚠️  CV dosyası bulunamadı: ${cvFilePath}`)
      console.warn(`      💡 cv-files klasörüne "${path.basename(cvFilePath)}" dosyasını ekleyin`)
    }
  }
  
  // Fotoğraf yükle
  if (photoFilePath) {
    const photoData = encodeCVFile(photoFilePath) // Aynı fonksiyon fotoğraf için de çalışır
    if (photoData) {
      found.person.photoData = photoData
      updates.photoData = 'yüklendi'
      console.log(`   📷 Fotoğraf yüklendi`)
    }
  }
  
  console.log(`   ✅ Güncellendi: ${Object.keys(updates).join(', ')}`)
  
  return true
}

/**
 * Excel dosyasından personel bilgilerini oku
 */
function readPersonnelFromExcel(excelPath) {
  if (!XLSX) {
    console.error('❌ xlsx kütüphanesi yüklü değil!')
    console.log('   Lütfen şunu çalıştırın: npm install xlsx')
    return []
  }
  
  console.log(`\n📂 Excel dosyası okunuyor: ${excelPath}`)
  
  try {
    const workbook = XLSX.readFile(excelPath)
    const sheetName = workbook.SheetNames[0] // İlk sayfayı oku
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    
    console.log(`✅ Excel dosyası okundu: ${sheetName} sayfası`)
    console.log(`📋 ${data.length} satır bulundu`)
    
    if (data.length === 0) {
      console.warn('⚠️  Excel dosyası boş!')
      return []
    }
    
    // İlk satırın başlıklarını göster
    if (data.length > 0) {
      console.log('📋 Kolonlar:', Object.keys(data[0]).join(', '))
    }
    
    const personnel = []
    
    for (const row of data) {
      // Kolon isimlerini normalize et (Türkçe karakterleri ve farklı isimleri kabul et)
      const name = row['İsim'] || row['İSİM'] || row['isim'] || row['İsim/Name'] || row['Name'] || row['name'] || ''
      const email = row['Email'] || row['EMAIL'] || row['email'] || row['E-Posta'] || row['E-posta'] || row['e-posta'] || ''
      const phone = row['Telefon'] || row['TELEFON'] || row['telefon'] || row['Phone'] || row['phone'] || row['Tel'] || row['tel'] || ''
      const university = row['Üniversite'] || row['ÜNİVERSİTE'] || row['üniversite'] || row['University'] || row['university'] || row['Okul'] || row['okul'] || ''
      const department = row['Bölüm'] || row['BÖLÜM'] || row['bölüm'] || row['Department'] || row['department'] || row['Department'] || ''
      const cvFilePath = row['CV_Dosya_Yolu'] || row['CV Dosya Yolu'] || row['CV Dosyası'] || row['CV'] || row['cv'] || row['CV_File'] || row['cvFile'] || ''
      const photoFilePath = row['Fotoğraf'] || row['FOTOĞRAF'] || row['fotoğraf'] || row['Photo'] || row['photo'] || row['Foto'] || row['foto'] || ''
      const notes = row['Notlar'] || row['NOTLAR'] || row['notlar'] || row['Notes'] || row['notes'] || row['Not'] || row['not'] || ''
      const jobDescription = row['Görev_Tanımı'] || row['Görev Tanımı'] || row['Görev'] || row['Job Description'] || row['jobDescription'] || row['Görev Tanımı'] || ''
      
      if (name && name.trim()) {
        personnel.push({
          name: name.trim(),
          email: email ? email.trim() : '',
          phone: phone ? phone.trim() : '',
          university: university ? university.trim() : '',
          department: department ? department.trim() : '',
          cvFilePath: cvFilePath ? cvFilePath.trim() : '',
          photoFilePath: photoFilePath ? photoFilePath.trim() : '',
          notes: notes ? notes.trim() : '',
          jobDescription: jobDescription ? jobDescription.trim() : ''
        })
      }
    }
    
    console.log(`✅ ${personnel.length} personel bilgisi Excel'den okundu`)
    return personnel
  } catch (error) {
    console.error('❌ Excel dosyası okunamadı:', error.message)
    return []
  }
}

/**
 * CSV'den personel bilgilerini oku
 */
function readPersonnelFromCSV(csvPath) {
  console.log(`\n📂 CSV dosyası okunuyor: ${csvPath}`)
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    console.error('❌ CSV dosyası boş veya sadece başlık satırı var!')
    return []
  }
  
  // Başlıkları parse et
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  console.log('📋 Kolonlar:', headers.join(', '))
  
  const personnel = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // CSV parse (basit - tırnak içindeki değerleri dikkate al)
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    
    const personData = {}
    headers.forEach((header, index) => {
      if (values[index]) {
        personData[header.toLowerCase().replace(/\s+/g, '')] = values[index].replace(/"/g, '')
      }
    })
    
    if (personData.isim || personData.name) {
      personnel.push({
        name: personData.isim || personData.name,
        email: personData.email || personData.e_posta,
        phone: personData.telefon || personData.phone,
        university: personData.universite || personData.university,
        department: personData.bölüm || personData.department || personData.bolum,
        cvFilePath: personData.cv_dosya_yolu || personData.cvfilepath || personData.cv,
        photoFilePath: personData.fotoğraf || personData.photo || personData.fotograf,
        notes: personData.notlar || personData.notes,
        jobDescription: personData.görev || personData.jobdescription || personData.job
      })
    }
  }
  
  console.log(`✅ ${personnel.length} personel bilgisi CSV'den okundu`)
  return personnel
}

/**
 * JSON'dan personel bilgilerini oku
 */
function readPersonnelFromJSON(jsonPath) {
  console.log(`\n📂 JSON dosyası okunuyor: ${jsonPath}`)
  
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
  const personnel = JSON.parse(jsonContent)
  
  console.log(`✅ ${personnel.length} personel bilgisi JSON'dan okundu`)
  return personnel
}

// Ana işlem
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
📖 KULLANIM:

🎯 Excel Dosyası ile (ÖNERİLEN):
   node scripts/update-personnel-info.js <excel-dosya-yolu.xlsx>
   
   Excel Formatı (İlk satır başlıklar):
   İsim | Email | Telefon | Üniversite | Bölüm | CV_Dosya_Yolu | Fotoğraf | Notlar | Görev_Tanımı
   Ahmet Yılmaz | ahmet@example.com | 0532 123 45 67 | İTÜ | Bilgisayar Mühendisliği | cv/ahmet.pdf | | |
   
   NOT: xlsx kütüphanesi gerekli: npm install xlsx

1. CSV Dosyası ile:
   node scripts/update-personnel-info.js <csv-dosya-yolu>
   
   CSV Format:
   İsim,Email,Telefon,Üniversite,Bölüm,CV_Dosya_Yolu,Notlar
   "Ahmet Yılmaz","ahmet@example.com","0532 123 45 67","İTÜ","Bilgisayar Mühendisliği","cv/ahmet.pdf",""

2. JSON Dosyası ile:
   node scripts/update-personnel-info.js <json-dosya-yolu>
   
   JSON Format:
   [
     {
       "name": "Ahmet Yılmaz",
       "email": "ahmet@example.com",
       "phone": "0532 123 45 67",
       "university": "İTÜ",
       "department": "Bilgisayar Mühendisliği",
       "cvFilePath": "cv/ahmet.pdf"
     }
   ]

📝 NOTLAR:
- CV dosya yolları proje kök dizinine göre olmalıdır
- CV dosyaları PDF, DOC, DOCX, JPG, PNG formatında olabilir
- Fotoğraflar JPG veya PNG formatında olmalıdır
- Excel dosyası için: npm install xlsx (önce kurun)
`)
    process.exit(0)
  }
  
  const inputFile = args[0]
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Dosya bulunamadı: ${inputFile}`)
    process.exit(1)
  }
  
  let personnel = []
  
  const fileExtension = path.extname(inputFile).toLowerCase()
  
  if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    personnel = readPersonnelFromExcel(inputFile)
  } else if (fileExtension === '.csv') {
    personnel = readPersonnelFromCSV(inputFile)
  } else if (fileExtension === '.json') {
    personnel = readPersonnelFromJSON(inputFile)
  } else {
    console.error('❌ Desteklenmeyen dosya formatı!')
    console.error('   Desteklenen formatlar: .xlsx, .xls, .csv, .json')
    process.exit(1)
  }
  
  if (personnel.length === 0) {
    console.error('❌ Hiç personel bilgisi bulunamadı!')
    process.exit(1)
  }
  
  console.log(`\n🔄 ${personnel.length} personel bilgisi güncelleniyor...\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (const personData of personnel) {
    if (updatePersonInfo(personData)) {
      successCount++
    } else {
      failCount++
    }
  }
  
  // org.json'ı kaydet
  fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf-8')
  
  console.log(`\n═══════════════════════════════════════════════════════════`)
  console.log(`✅ GÜNCELLEME TAMAMLANDI!`)
  console.log(`   ✅ Başarılı: ${successCount}`)
  console.log(`   ❌ Başarısız: ${failCount}`)
  console.log(`═══════════════════════════════════════════════════════════`)
  console.log(`\n💾 org.json dosyası güncellendi: ${orgJsonPath}`)
  console.log(`\n📤 Şimdi Firebase'e yüklemek için:`)
  console.log(`   node scripts/sync-all.js`)
}

main().catch(console.error)
