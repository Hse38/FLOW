const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const excelPath = path.resolve(__dirname, '..', 'PERS.xlsx')

console.log('🔍 Dosya kontrolü:')
console.log('   Yol:', excelPath)
console.log('   Var mı?', fs.existsSync(excelPath) ? '✅ EVET' : '❌ HAYIR')

if (!fs.existsSync(excelPath)) {
  console.error('\n❌ Dosya bulunamadı!')
  process.exit(1)
}

console.log('\n📂 Excel dosyası okunuyor...')

try {
  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  console.log('✅ Sayfa:', sheetName)
  
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })
  
  console.log(`📊 Toplam satır: ${data.length}\n`)
  
  if (data.length > 0) {
    const columns = Object.keys(data[0])
    console.log(`📋 Kolonlar (${columns.length} adet):`)
    columns.forEach((col, i) => {
      console.log(`   ${(i+1).toString().padStart(2, ' ')}. ${col}`)
    })
    
    console.log(`\n📝 İlk 5 satır örneği:\n`)
    data.slice(0, 5).forEach((row, i) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`${i+1}. Satır:`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      columns.slice(0, 10).forEach(key => {
        const value = String(row[key] || '').trim()
        if (value) {
          const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value
          console.log(`   ${key.padEnd(25, ' ')}: ${displayValue}`)
        }
      })
      console.log()
    })
  }
} catch (error) {
  console.error('\n❌ HATA:', error.message)
  console.error(error.stack)
}
