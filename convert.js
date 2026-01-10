// convert-excel-to-org.js
import fs from 'fs'

// CSV dosya adı
const CSV_FILE = 'haluk.csv'

// Basit slug
const slug = (s) =>
  s.toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'id-' + Math.random().toString(36).slice(2, 8)

// CSV oku
const csv = fs.readFileSync(CSV_FILE, 'utf8').trim().split('\n')
const rows = csv.map(r => r.split(',').map(c => c.trim()))
const [header, ...data] = rows

// Grupla: Koordinatörlük -> satırlar
const groups = {}
data.forEach(cols => {
  const [dept, level, title, g1, g2, g3, g4] = cols
  if (!groups[dept]) groups[dept] = []
  groups[dept].push({ dept, level, title, tasks: [g1, g2, g3, g4].filter(Boolean) })
})

// Pozisyon ızgarası
const gridPos = (i, colW = 320, rowH = 200, offsetY = 200, offsetX = 0) => ({
  x: offsetX + (i % 4) * colW,
  y: offsetY + Math.floor(i / 4) * rowH
})

// mainCoordinators ve coordinators üret
const mainCoordinators = []
const coordinators = []

let groupIndex = 0
for (const dept of Object.keys(groups)) {
  const mcId = slug(dept) || `mc-${groupIndex}`
  const mcPos = gridPos(groupIndex, 500, 260, 100, 0)
  mainCoordinators.push({
    id: mcId,
    title: dept,
    description: '',
    type: 'main-coordinator',
    position: mcPos,
    parent: null
  })

  groups[dept].forEach((row, idx) => {
    const cId = slug(`${row.dept}-${row.level}-${row.title}`) || `c-${groupIndex}-${idx}`
    const pos = gridPos(idx, 300, 180, mcPos.y + 200, mcPos.x - 300)
    coordinators.push({
      id: cId,
      title: row.title || row.level || row.dept || 'Birim',
      description: row.level || '',
      responsibilities: row.tasks,
      position: pos,
      parent: mcId
    })
  })

  groupIndex += 1
}

// Çıktı
const output = {
  management: [],
  executives: [],
  mainCoordinators,
  coordinators,
  units: [],
  people: []
}

fs.writeFileSync('org-generated.json', JSON.stringify(output, null, 2), 'utf8')
console.log('org-generated.json yazıldı; data/org.json ile aynı şemada.')