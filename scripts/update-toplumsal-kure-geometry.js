const fs = require('fs')
const path = require('path')

// Firebase config (force-rebuild-connections.js ile aynı)
const { initializeApp } = require('firebase/app')
const { getDatabase, ref, set, get } = require('firebase/database')

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

async function updateToplumsalKureGeometry() {
  try {
    console.log('🔄 Toplumsal Çalışmalar ve Küre bağlantı geometrisi güncelleniyor...')
    
    // Mevcut bağlantıları oku
    const connectionsRef = ref(database, 'connections/main')
    const snapshot = await get(connectionsRef)
    const connections = snapshot.val() || []
    
    console.log(`📊 Mevcut ${connections.length} bağlantı bulundu`)
    
    // Node pozisyonları (org.json'dan)
    const selcukPos = { x: 100, y: 150 }
    const toplumsalPos = { x: -600, y: 490 }
    const kurePos = { x: -300, y: 490 }
    
    // Node genişlikleri (tahmini - gerçek değerler node component'lerinden alınabilir)
    const nodeWidth = 200
    const nodeHeight = 80
    
    // Selçuk Bayraktar'dan çıkış noktası (sol kenarın ortası)
    const selcukLeft = {
      x: selcukPos.x - nodeWidth / 2,  // Sol kenar
      y: selcukPos.y                    // Ortası (dikey)
    }
    
    // Ortak yatay çizgi yüksekliği (iki node'un ortası)
    const horizontalY = (toplumsalPos.y + kurePos.y) / 2 // İki node'un ortası
    const branchX = (toplumsalPos.x + kurePos.x) / 2 // İki node'un ortası: -450
    
    // Toplumsal Çalışmalar için waypoints
    // Selçuk'un sol kenarından → sola yatay → Toplumsal'a dikey
    const toplumsalWaypoints = [
      { x: branchX, y: selcukLeft.y },                 // Sola yatay (ortak nokta)
      { x: branchX, y: horizontalY },                  // Aşağı dikey
      { x: toplumsalPos.x, y: horizontalY },           // Toplumsal'ın üstüne kadar yatay
      { x: toplumsalPos.x, y: toplumsalPos.y - nodeHeight / 2 } // Toplumsal'a dikey
    ]
    
    // Küre için waypoints
    // Selçuk'un sol kenarından → sola yatay → Küre'ye dikey
    const kureWaypoints = [
      { x: branchX, y: selcukLeft.y },                 // Sola yatay (ortak nokta)
      { x: branchX, y: horizontalY },                  // Aşağı dikey
      { x: kurePos.x, y: horizontalY },                // Küre'nin üstüne kadar yatay
      { x: kurePos.x, y: kurePos.y - nodeHeight / 2 }   // Küre'ye dikey
    ]
    
    // Bağlantıları güncelle
    let updated = 0
    const updatedConnections = connections.map(conn => {
      // Toplumsal Çalışmalar bağlantısı
      if (conn.source === 'selcuk-bayraktar' && conn.target === 'toplumsal-calismalar') {
        console.log('✅ Toplumsal Çalışmalar waypoints güncelleniyor...')
        updated++
        return {
          ...conn,
          waypoints: toplumsalWaypoints,
          sourceHandle: 'left-source',
          targetHandle: 'top'
        }
      }
      
      // Küre bağlantısı
      if (conn.source === 'selcuk-bayraktar' && conn.target === 'kure-koordinatorlugu') {
        console.log('✅ Küre waypoints güncelleniyor...')
        updated++
        return {
          ...conn,
          waypoints: kureWaypoints,
          sourceHandle: 'left-source',
          targetHandle: 'top'
        }
      }
      
      return conn
    })
    
    if (updated === 0) {
      console.log('⚠️ Toplumsal Çalışmalar veya Küre bağlantıları bulunamadı. Yeni bağlantılar ekleniyor...')
      
      // Bağlantılar yoksa ekle
      updatedConnections.push({
        source: 'selcuk-bayraktar',
        target: 'toplumsal-calismalar',
        sourceHandle: 'left-source',
        targetHandle: 'top',
        waypoints: toplumsalWaypoints,
        data: {}
      })
      
      updatedConnections.push({
        source: 'selcuk-bayraktar',
        target: 'kure-koordinatorlugu',
        sourceHandle: 'left-source',
        targetHandle: 'top',
        waypoints: kureWaypoints,
        data: {}
      })
      
      updated = 2
    }
    
    // Firebase'e kaydet
    await set(connectionsRef, updatedConnections)
    console.log(`✅ ${updated} bağlantı geometrisi güncellendi ve Firebase'e kaydedildi`)
    console.log('\n📐 Waypoint detayları:')
    console.log('Toplumsal Çalışmalar:', JSON.stringify(toplumsalWaypoints, null, 2))
    console.log('Küre:', JSON.stringify(kureWaypoints, null, 2))
    
    // localStorage kodu oluştur
    const localStorageCode = `
// Tarayıcı konsolunda çalıştırın:
const connections = ${JSON.stringify(updatedConnections, null, 2)};
localStorage.setItem('orgConnections_main', JSON.stringify(connections));
console.log('✅ Bağlantılar localStorage\'a kaydedildi');
location.reload();
`
    
    fs.writeFileSync(
      path.join(__dirname, '../TOPLUMSAL-KURE-GEOMETRI-KODU.txt'),
      localStorageCode.trim()
    )
    console.log('\n📄 localStorage kodu TOPLUMSAL-KURE-GEOMETRI-KODU.txt dosyasına kaydedildi')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

updateToplumsalKureGeometry()
  .then(() => {
    console.log('\n✅ İşlem tamamlandı!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Kritik hata:', error)
    process.exit(1)
  })
