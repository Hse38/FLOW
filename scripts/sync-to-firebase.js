// Firebase'e lokal verileri yükleme scripti
// ⚠️ DİKKAT: Bu script org.json'daki verileri Firebase'e yazar ve Firebase'deki mevcut verileri SİLER!
// Eğer canlıda (Firebase'de) değişiklik yaptıysanız, önce sync-from-firebase.js çalıştırın!
// Kullanım: node scripts/sync-to-firebase.js
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrSbdQZSFd8VYWW8a-h2ToNs6FJSHZdXc",
  authDomain: "t3-vakfi-org.firebaseapp.com",
  databaseURL: "https://t3-vakfi-org-default-rtdb.firebaseio.com",
  projectId: "t3-vakfi-org",
  storageBucket: "t3-vakfi-org.firebasestorage.app",
  messagingSenderId: "218972745568",
  appId: "1:218972745568:web:4626c4ff1e03e9da323805",
  measurementId: "G-X2TN72QCF1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function syncToFirebase() {
  try {
    const projectId = 'main';
    
    console.log('⚠️⚠️⚠️ UYARI: Bu script Firebase\'deki mevcut verileri SİLECEK! ⚠️⚠️⚠️');
    console.log('💡 Eğer canlıda değişiklik yaptıysanız, önce şunu çalıştırın:');
    console.log('   node scripts/sync-from-firebase.js');
    console.log('');
    
    // org.json dosyasını oku
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    
    console.log('📤 Firebase\'e yükleniyor...');
    console.log('  - Project ID:', projectId);
    console.log('  - Coordinators:', orgData.coordinators?.length || 0);
    
    // Firebase'e yaz - TÜM VERİLERİ YÜKLE
    console.log('  - SubUnits içeren coordinators:', orgData.coordinators?.filter(c => c.subUnits && c.subUnits.length > 0).length || 0);
    console.log('  - People içeren coordinators:', orgData.coordinators?.filter(c => {
      if (c.subUnits) {
        return c.subUnits.some(sub => sub.people && sub.people.length > 0);
      }
      return false;
    }).length || 0);
    
    await set(ref(database, `orgData/${projectId}`), orgData);
    console.log('  ✅ orgData Firebase\'e yüklendi');
    
      // Doğrulama
      const snapshot = await get(ref(database, `orgData/${projectId}`));
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        console.log('');
        console.log('✅✅✅ TÜM VERİLER FIREBASE\'E BAŞARIYLA YÜKLENDİ! ✅✅✅');
        console.log('📍 Project ID:', projectId);
        console.log('  - Firebase\'deki coordinators:', firebaseData.coordinators?.length || 0);
        
        // Kurumsal İletişim kontrolü
        const kurumsalIletisim = firebaseData.coordinators?.find(c => c.id === 'kurumsal-iletisim');
        if (kurumsalIletisim) {
          console.log('  - Kurumsal İletişim Koordinatörlüğü bulundu!');
          console.log('    - Koordinatör:', kurumsalIletisim.coordinator?.name);
          console.log('    - Yardımcılar:', kurumsalIletisim.deputies?.length || 0);
          console.log('    - Alt Birimler:', kurumsalIletisim.subUnits?.length || 0);
          if (kurumsalIletisim.subUnits && kurumsalIletisim.subUnits.length > 0) {
            const totalPeople = kurumsalIletisim.subUnits.reduce((sum, sub) => sum + (sub.people?.length || 0), 0);
            console.log('    - Toplam Personel:', totalPeople);
          }
        }
        
        // Teknofest Fuar kontrolü
        const teknofestFuar = firebaseData.coordinators?.find(c => c.id === 'teknofest-fuar');
        if (teknofestFuar) {
          console.log('  - Teknofest Fuar Koordinatörlüğü bulundu!');
          console.log('    - Koordinatör:', teknofestFuar.coordinator?.name);
          console.log('    - Alt Birimler:', teknofestFuar.subUnits?.length || 0);
          if (teknofestFuar.subUnits && teknofestFuar.subUnits.length > 0) {
            const totalPeople = teknofestFuar.subUnits.reduce((sum, sub) => sum + (sub.people?.length || 0), 0);
            console.log('    - Toplam Personel:', totalPeople);
          }
        }
        
        // DENEYAP Kart kontrolü
        const deneyapKart = firebaseData.coordinators?.find(c => c.id === 'deneyap-kart');
        if (deneyapKart) {
          console.log('  - DENEYAP Kart Birimi bulundu!');
          console.log('    - Alt Birimler:', deneyapKart.subUnits?.length || 0);
          if (deneyapKart.subUnits && deneyapKart.subUnits.length > 0) {
            const totalPeople = deneyapKart.subUnits.reduce((sum, sub) => sum + (sub.people?.length || 0), 0);
            console.log('    - Toplam Personel:', totalPeople);
          }
        }
        
        // İdari İşler kontrolü
        const idariIsler = firebaseData.coordinators?.find(c => c.id === 'idari-isler');
        if (idariIsler) {
          console.log('  - İdari İşler Koordinatörlüğü bulundu!');
          console.log('    - Alt Birimler:', idariIsler.subUnits?.length || 0);
          if (idariIsler.subUnits && idariIsler.subUnits.length > 0) {
            const totalPeople = idariIsler.subUnits.reduce((sum, sub) => sum + (sub.people?.length || 0), 0);
            console.log('    - Toplam Personel:', totalPeople);
          }
        }
        
        // City Personnel kontrolü
        console.log('  - İl Personeli:', firebaseData.cityPersonnel?.length || 0);
        
        console.log('');
        console.log('🎉 BAŞARILI! Tüm veriler Firebase\'e yüklendi. Canlıda görünecek.');
      } else {
        console.warn('⚠️ DOĞRULAMA: Firebase\'de veri bulunamadı!');
      }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase\'e yükleme hatası:', error);
    process.exit(1);
  }
}

syncToFirebase();
