const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const excelPath = path.join(__dirname, '..', 'PERS.xlsx')

console.log('📂 Excel dosyası okunuyor:', excelPath)

try {
  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  
  console.log(`\n✅ Excel dosyası okundu: ${sheetName}`)
  console.log(`📊 Toplam satır: ${data.length}`)
  
  if (data.length > 0) {
    const columns = Object.keys(data[0])
    console.log(`\n📋 Kolonlar (${columns.length} adet):`)
    columns.forEach((col, i) => console.log(`   ${i+1}. ${col}`))
    
    console.log(`\n📝 İlk 10 satır örneği:`)
    data.slice(0, 10).forEach((row, i) => {
      console.log(`\n━━━ ${i+1}. Satır ━━━`)
      columns.forEach(key => {
        const value = String(row[key] || '').trim()
        if (value) {
          const displayValue = value.length > 80 ? value.substring(0, 80) + '...' : value
          console.log(`   ${key}: ${displayValue}`)
        }
      })
    })
    
    // İsim kolonunu bul
    const nameColumns = columns.filter(col => 
      col.toLowerCase().includes('isim') || 
      col.toLowerCase().includes('name') || 
      col.toLowerCase().includes('ad')
    )
    console.log(`\n🔍 İsim kolonları: ${nameColumns.join(', ') || 'BULUNAMADI!'}`)
    
    // CV kolonunu bul
    const cvColumns = columns.filter(col => 
      col.toLowerCase().includes('cv') || 
      col.toLowerCase().includes('dosya')
    )
    console.log(`🔍 CV kolonları: ${cvColumns.join(', ') || 'BULUNAMADI!'}`)
  }
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
}
