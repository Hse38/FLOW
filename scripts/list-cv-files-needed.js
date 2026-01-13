/**
 * Excel'deki CV dosya isimlerini listele
 * Kullanıcının hangi dosyaları cv-files klasörüne koyması gerektiğini gösterir
 */

const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const excelPath = path.resolve(__dirname, '..', 'PERS.xlsx')

console.log('📋 Excel\'den CV dosya isimlerini listeliyorum...\n')

try {
  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  
  // CV ve İsim kolonlarını bul
  const firstRow = data[0]
  const columns = Object.keys(firstRow)
  const cvColumn = columns.find(col => 
    col.toLowerCase().includes('cv') || 
    col.toLowerCase().includes('dosya') ||
    col.toLowerCase().includes('file')
  )
  const nameColumn = columns.find(col => 
    col.toLowerCase().includes('isim') || 
    col.toLowerCase().includes('name') || 
    col.toLowerCase().includes('ad')
  )
  
  if (!cvColumn) {
    console.error('❌ CV kolonu bulunamadı!')
    process.exit(1)
  }
  
  console.log(`📋 CV Kolonu: "${cvColumn}"`)
  console.log(`📋 İsim Kolonu: "${nameColumn || 'Bulunamadı'}"\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📄 CV DOSYALARI LİSTESİ (cv-files klasörüne koymanız gerekenler)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const cvFiles = new Map()
  
  for (const row of data) {
    const cvPath = row[cvColumn] ? String(row[cvColumn]).trim() : ''
    const name = nameColumn ? (row[nameColumn] || '').trim() : ''
    
    if (cvPath && cvPath.toUpperCase() !== 'YOK') {
      const fileName = path.basename(cvPath)
      if (!cvFiles.has(fileName)) {
        cvFiles.set(fileName, name)
      }
    }
  }
  
  const sortedFiles = Array.from(cvFiles.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  
  console.log(`Toplam ${sortedFiles.length} farklı CV dosyası bulundu:\n`)
  
  sortedFiles.forEach(([fileName, personName], index) => {
    const extension = path.extname(fileName).toLowerCase()
    const icon = extension === '.pdf' ? '📄' : extension === '.docx' || extension === '.doc' ? '📝' : extension === '.png' ? '🖼️' : '📎'
    
    console.log(`${(index + 1).toString().padStart(3, ' ')}. ${icon} ${fileName}`)
    if (personName) {
      console.log(`      👤 ${personName}`)
    }
    console.log()
  })
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n💡 Bu ${sortedFiles.length} dosyayı "cv-files" klasörüne koyun.`)
  console.log(`   Klasör yolu: ${path.join(__dirname, '..', 'cv-files')}\n`)
  
  // Dosya listesini bir dosyaya da kaydet
  const listFile = path.join(__dirname, '..', 'cv-files-list.txt')
  const fileContent = sortedFiles.map(([fileName, personName], index) => {
    return `${index + 1}. ${fileName}${personName ? ` (${personName})` : ''}`
  }).join('\n')
  
  fs.writeFileSync(listFile, fileContent, 'utf-8')
  console.log(`📝 Dosya listesi kaydedildi: cv-files-list.txt\n`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
}
