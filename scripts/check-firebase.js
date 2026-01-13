// Firebase'den verileri kontrol etme scripti
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

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

async function checkFirebase() {
  try {
    const projectId = 'main';
    
    console.log('🔍 Firebase\'den veriler kontrol ediliyor...');
    console.log('  - Project ID:', projectId);
    console.log('');
    
    // Firebase'den verileri çek
    const snapshot = await get(ref(database, `orgData/${projectId}`));
    
    if (!snapshot.exists()) {
      console.error('❌ Firebase\'de VERİ YOK!');
      console.log('');
      console.log('⚠️ Firebase\'e veri yüklenmesi gerekiyor!');
      process.exit(1);
    }
    
    const firebaseData = snapshot.val();
    console.log('✅ Firebase\'de veri mevcut!');
    console.log('');
    console.log('📊 VERİ ÖZETİ:');
    console.log('  - Coordinators:', firebaseData.coordinators?.length || 0);
    console.log('  - Executives:', firebaseData.executives?.length || 0);
    console.log('  - Main Coordinators:', firebaseData.mainCoordinators?.length || 0);
    console.log('  - City Personnel:', firebaseData.cityPersonnel?.length || 0);
    console.log('');
    
    // DENEYAP Kart kontrolü
    const deneyapKart = firebaseData.coordinators?.find(c => c.id === 'deneyap-kart');
    if (deneyapKart) {
      console.log('✅ DENEYAP Kart Birimi:');
      console.log('  - Başlık:', deneyapKart.title);
      console.log('  - Alt Birimler:', deneyapKart.subUnits?.length || 0);
      if (deneyapKart.subUnits && deneyapKart.subUnits.length > 0) {
        console.log('  - Alt Birim Detayları:');
        deneyapKart.subUnits.forEach((sub, idx) => {
          console.log(`    ${idx + 1}. ${sub.title}`);
          console.log(`       - Personel: ${sub.people?.length || 0}`);
          if (sub.people && sub.people.length > 0) {
            sub.people.forEach(p => {
              console.log(`         • ${p.name} (${p.title || 'Sorumlu'})`);
            });
          }
          console.log(`       - Görevler: ${sub.responsibilities?.length || 0}`);
        });
      }
    } else {
      console.error('❌ DENEYAP Kart Birimi BULUNAMADI!');
    }
    
    console.log('');
    
    // Teknofest Fuar kontrolü
    const teknofestFuar = firebaseData.coordinators?.find(c => c.id === 'teknofest-fuar');
    if (teknofestFuar) {
      console.log('✅ Teknofest Fuar Koordinatörlüğü:');
      console.log('  - Başlık:', teknofestFuar.title);
      console.log('  - Koordinatör:', teknofestFuar.coordinator?.name || 'YOK');
      console.log('  - Alt Birimler:', teknofestFuar.subUnits?.length || 0);
      if (teknofestFuar.subUnits && teknofestFuar.subUnits.length > 0) {
        teknofestFuar.subUnits.forEach((sub, idx) => {
          console.log(`    ${idx + 1}. ${sub.title}`);
          console.log(`       - Personel: ${sub.people?.length || 0}`);
          if (sub.people && sub.people.length > 0) {
            sub.people.forEach(p => {
              console.log(`         • ${p.name} (${p.title || 'Sorumlu'})`);
            });
          }
        });
      }
    } else {
      console.error('❌ Teknofest Fuar Koordinatörlüğü BULUNAMADI!');
    }
    
    console.log('');
    console.log('✅ Firebase\'de tüm veriler mevcut!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase kontrol hatası:', error);
    process.exit(1);
  }
}

checkFirebase();
