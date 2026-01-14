const fs = require('fs')
const path = require('path')

// Firebase config
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

async function moveMuhasebeToSubunit() {
  try {
    console.log('🏦 Muhasebe birimi alt birim olarak taşınıyor...')
    
    // org.json'u oku
    const orgPath = path.resolve(__dirname, '..', 'data', 'org.json')
    const orgData = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
    
    // Backup
    const backupPath = orgPath + '.backup.' + Date.now()
    fs.writeFileSync(backupPath, JSON.stringify(orgData, null, 2))
    console.log(`📦 Backup oluşturuldu: ${backupPath}`)
    
    // Muhasebe koordinatörlüğünü bul ve sil
    const muhasebeIndex = orgData.coordinators.findIndex(c => c.id === 'muhasebe')
    let muhasebeData = null
    
    if (muhasebeIndex !== -1) {
      muhasebeData = orgData.coordinators[muhasebeIndex]
      orgData.coordinators.splice(muhasebeIndex, 1)
      console.log('✅ Muhasebe koordinatörlüğü silindi')
    } else {
      console.log('⚠️ Muhasebe koordinatörlüğü bulunamadı, yeni oluşturulacak')
    }
    
    // Yönetime bağlı birimler'i bul
    const yonetimeBagli = orgData.coordinators.find(c => c.id === 'yonetime-bagli-birimler')
    
    if (!yonetimeBagli) {
      console.error('❌ Yönetime bağlı birimler koordinatörlüğü bulunamadı!')
      process.exit(1)
    }
    
    // Muhasebe alt birimi oluştur
    const muhasebeSubUnit = {
      id: 'muhasebe-birimi',
      title: 'MUHASEBE',
      description: 'Mali işler ve muhasebe',
      people: [
        {
          id: 'serkan-uzun',
          name: 'SERKAN UZUN',
          title: 'ALAN UZMANI (AU1)',
          university: 'ANADOLU ÜNİVERSİTESİ',
          department: 'MALİYE',
          hireDate: '4/22/19',
          seniority: '6 yıl 8 ay',
          jobDescriptionLink: 'https://docs.google.com/spreadsheets/d/1vvMXMtCzbmbsITZMPrhrehAJhiRyx3xD/edit?usp=sharing&ouid=113355116848335080907&rtpof=true&sd=true'
        },
        {
          id: 'muhlis-semiz',
          name: 'MUHLİS SEMİZ',
          title: 'UZMAN (U1)',
          university: 'ULUDAĞ ÜNİVERSİTESİ',
          department: 'MALİYE',
          hireDate: '6/5/23',
          seniority: '2 yıl 7 ay',
          jobDescriptionLink: 'https://docs.google.com/spreadsheets/d/1aiYYzAzLuXGIH3PmxvjA14x8O4zUJlfq/edit?usp=sharing&ouid=113355116848335080907&rtpof=true&sd=true'
        }
      ],
      responsibilities: [
        'Muhasebe ve mevzuat yönetimi',
        'Bütçe, nakit akışı ve ödeme süreçleri',
        'Bordro, personel ve burs işlemleri',
        'TEKNOFEST ve ticari işletme mali yönetimi',
        'Faturalama ve muhasebe kayıt işlemleri',
        'Finansal raporlama ve iç kontrol desteği'
      ]
    }
    
    // Mevcut muhasebe-birimi varsa sil
    if (yonetimeBagli.subUnits) {
      yonetimeBagli.subUnits = yonetimeBagli.subUnits.filter(su => su.id !== 'muhasebe-birimi' && su.id !== 'muhasebe')
    } else {
      yonetimeBagli.subUnits = []
    }
    
    // Yeni muhasebe alt birimini ekle
    yonetimeBagli.subUnits.push(muhasebeSubUnit)
    console.log('✅ Muhasebe alt birimi eklendi')
    console.log(`   - Serkan Uzun: ALAN UZMANI (AU1)`)
    console.log(`   - Muhlis Semiz: UZMAN (U1)`)
    
    // org.json'a kaydet
    fs.writeFileSync(orgPath, JSON.stringify(orgData, null, 2))
    console.log('✅ org.json güncellendi')
    
    // Firebase'e kaydet
    const projectId = 'main'
    await set(ref(database, `orgData/${projectId}`), orgData)
    console.log('✅ Firebase\'e kaydedildi!')
    
    console.log('\n🎉 Muhasebe birimi başarıyla taşındı!')
    console.log('   Artık "Yönetime Bağlı Birimler" altında bir alt birim kartı olarak görünecek.')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

moveMuhasebeToSubunit()
  .then(() => {
    console.log('\n✅ İşlem tamamlandı!')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Hata:', err)
    process.exit(1)
  })
