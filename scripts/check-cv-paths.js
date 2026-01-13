const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const excelPath = path.resolve(__dirname, '..', 'PERS.xlsx')

process.stdout.write('📂 Excel dosyasından CV yollarını kontrol ediyorum...\n\n')

try {
  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  
  console.log(`✅ Excel okundu: ${data.length} satır\n`)
  
  // CV kolonunu bul
  const firstRow = data[0]
  const columns = Object.keys(firstRow)
  const cvColumn = columns.find(col => 
    col.toLowerCase().includes('cv') || 
    col.toLowerCase().includes('dosya') ||
    col.toLowerCase().includes('file')
  )
  
  if (!cvColumn) {
    console.log('⚠️  CV kolonu bulunamadı!')
    console.log('📋 Mevcut kolonlar:', columns.join(', '))
    process.exit(1)
  }
  
  console.log(`📋 CV Kolonu: "${cvColumn}"\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📄 CV DOSYA YOLLARI ANALİZİ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const cvPaths = []
  const nameColumn = columns.find(col => 
    col.toLowerCase().includes('isim') || 
    col.toLowerCase().includes('name') || 
    col.toLowerCase().includes('ad')
  )
  
  for (const row of data) {
    const cvPath = row[cvColumn] ? String(row[cvColumn]).trim() : ''
    const name = nameColumn ? (row[nameColumn] || '').trim() : 'Bilinmiyor'
    
    if (cvPath) {
      cvPaths.push({ name, path: cvPath })
    }
  }
  
  console.log(`📊 Toplam ${cvPaths.length} CV yolu bulundu\n`)
  
  // Benzersiz yolları göster
  const uniquePaths = [...new Set(cvPaths.map(p => p.path))]
  console.log('📂 BULUNAN CV DOSYA YOLLARI:\n')
  uniquePaths.forEach((cvPath, i) => {
    console.log(`${(i+1).toString().padStart(3, ' ')}. ${cvPath}`)
    
    // Dosya var mı kontrol et
    let fullPath = cvPath
    if (!path.isAbsolute(cvPath)) {
      fullPath = path.join(__dirname, '..', cvPath)
    }
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath)
      console.log(`     ✅ VAR (${(stats.size / 1024).toFixed(2)} KB)`)
    } else {
      // Alternatif yolları dene
      const fileName = path.basename(cvPath)
      const altPaths = [
        path.join(__dirname, '..', 'cv-files', fileName),
        path.join(__dirname, '..', 'cv', fileName),
        path.join(__dirname, '..', fileName),
      ]
      
      let found = false
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          console.log(`     ⚠️  BULUNDU (alternatif): ${altPath}`)
          found = true
          break
        }
      }
      
      if (!found) {
        console.log(`     ❌ BULUNAMADI`)
      }
    }
  })
  
  // Dosya isimlerini çıkar
  const fileNames = uniquePaths.map(p => path.basename(p)).filter(f => f)
  const extensions = [...new Set(fileNames.map(f => path.extname(f).toLowerCase()))].filter(e => e)
  
  console.log(`\n📊 İSTATİSTİKLER:`)
  console.log(`   - Toplam CV yolu: ${cvPaths.length}`)
  console.log(`   - Benzersiz yol: ${uniquePaths.length}`)
  console.log(`   - Dosya uzantıları: ${extensions.join(', ') || 'yok'}`)
  
  // Dosyaların konumu için öneri
  console.log(`\n💡 ÖNERİLER:`)
  if (!fs.existsSync(path.join(__dirname, '..', 'cv-files'))) {
    console.log(`   1. Proje kök dizininde "cv-files" klasörü oluşturun`)
    console.log(`   2. Tüm CV dosyalarını bu klasöre koyun`)
    console.log(`   3. Excel'deki CV yollarını "cv-files/DosyaAdı.pdf" formatına güncelleyin`)
  } else {
    console.log(`   ✅ "cv-files" klasörü mevcut`)
    console.log(`   📁 Konum: ${path.join(__dirname, '..', 'cv-files')}`)
  }
  
  // Eksik dosyaları listele
  const missingFiles = cvPaths.filter(p => {
    let fullPath = p.path
    if (!path.isAbsolute(p.path)) {
      fullPath = path.join(__dirname, '..', p.path)
    }
    return !fs.existsSync(fullPath)
  })
  
  if (missingFiles.length > 0) {
    console.log(`\n⚠️  BULUNAMAYAN DOSYALAR (${missingFiles.length} adet):\n`)
    missingFiles.slice(0, 20).forEach(p => {
      console.log(`   - ${p.name}: ${p.path}`)
    })
    if (missingFiles.length > 20) {
      console.log(`   ... ve ${missingFiles.length - 20} tane daha`)
    }
  }
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
}
