// Firebase'e ZORLA veri yükleme - TÜM VERİLER
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');
const fs = require('fs');
const path = require('path');

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function forceSync() {
  try {
    console.log('🚀 FIREBASE\'E ZORLA YÜKLEME BAŞLIYOR...\n');
    
    const projectId = 'main';
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    
    console.log('📊 ORG.JSON VERİLERİ:');
    console.log('  - Coordinators:', orgData.coordinators?.length || 0);
    
    // DENEYAP Kart detayları
    const deneyapKart = orgData.coordinators?.find(c => c.id === 'deneyap-kart');
    if (deneyapKart) {
      console.log('\n✅ DENEYAP Kart Birimi (org.json):');
      console.log('  - Alt Birimler:', deneyapKart.subUnits?.length || 0);
      if (deneyapKart.subUnits) {
        deneyapKart.subUnits.forEach((sub, i) => {
          console.log(`    ${i+1}. ${sub.title}`);
          console.log(`       Personel: ${sub.people?.length || 0}`);
          if (sub.people) {
            sub.people.forEach(p => console.log(`         - ${p.name}`));
          }
        });
      }
    }
    
    // Firebase'e YAZ
    console.log('\n📤 Firebase\'e yazılıyor...');
    await set(ref(database, `orgData/${projectId}`), orgData);
    console.log('✅ Firebase\'e yazıldı!\n');
    
    // DOĞRULAMA
    console.log('🔍 Firebase\'den okunuyor (doğrulama)...');
    const snapshot = await get(ref(database, `orgData/${projectId}`));
    
    if (snapshot.exists()) {
      const fbData = snapshot.val();
      console.log('✅ Firebase\'de veri var!');
      console.log('  - Coordinators:', fbData.coordinators?.length || 0);
      
      const fbDeneyap = fbData.coordinators?.find(c => c.id === 'deneyap-kart');
      if (fbDeneyap) {
        console.log('\n✅ DENEYAP Kart Birimi (Firebase):');
        console.log('  - Alt Birimler:', fbDeneyap.subUnits?.length || 0);
        if (fbDeneyap.subUnits) {
          fbDeneyap.subUnits.forEach((sub, i) => {
            console.log(`    ${i+1}. ${sub.title}`);
            console.log(`       Personel: ${sub.people?.length || 0}`);
            if (sub.people) {
              sub.people.forEach(p => console.log(`         - ${p.name}`));
            }
          });
        }
      }
      
      console.log('\n🎉 BAŞARILI! Tüm veriler Firebase\'de!');
    } else {
      console.error('❌ Firebase\'de veri YOK!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ HATA:', error.message);
    console.error(error);
    process.exit(1);
  }
}

forceSync();
