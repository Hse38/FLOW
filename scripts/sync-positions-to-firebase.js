// Lokaldeki tüm node pozisyonlarını Firebase'e yükleme scripti
// Bu script org.json'daki tüm pozisyonları Firebase'e yazar
// Kullanım: node scripts/sync-positions-to-firebase.js

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

async function syncPositionsToFirebase() {
  try {
    const projectId = 'main';
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    
    console.log('📤 Lokaldeki pozisyonlar Firebase\'e yükleniyor...');
    console.log('  - Project ID:', projectId);
    
    // org.json dosyasını oku
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    
    // Tüm pozisyonları topla
    const positions = {};
    
    // Management pozisyonları
    if (orgData.management && Array.isArray(orgData.management)) {
      orgData.management.forEach(item => {
        if (item.id && item.position) {
          positions[item.id] = item.position;
        }
      });
    }
    
    // Executives pozisyonları
    if (orgData.executives && Array.isArray(orgData.executives)) {
      orgData.executives.forEach(exec => {
        if (exec.id && exec.position) {
          positions[exec.id] = exec.position;
        }
      });
    }
    
    // Main Coordinators pozisyonları
    if (orgData.mainCoordinators && Array.isArray(orgData.mainCoordinators)) {
      orgData.mainCoordinators.forEach(coord => {
        if (coord.id && coord.position) {
          positions[coord.id] = coord.position;
        }
      });
    }
    
    // Coordinators pozisyonları
    if (orgData.coordinators && Array.isArray(orgData.coordinators)) {
      orgData.coordinators.forEach(coord => {
        if (coord.id && coord.position) {
          positions[coord.id] = coord.position;
        }
      });
    }
    
    // Expanded detail node pozisyonları (detail-{coordId}-root formatında)
    // Bu pozisyonlar expanded coordinator'lar için
    if (orgData.coordinators && Array.isArray(orgData.coordinators)) {
      orgData.coordinators.forEach(coord => {
        if (coord.id) {
          const detailNodeId = `detail-${coord.id}-root`;
          // Expanded node pozisyonları genellikle parent'ın altında olur
          // Eğer org.json'da direkt pozisyon yoksa, hesaplanmış pozisyonu kullan
          if (coord.position) {
            // Expanded node genellikle parent'ın 200px altında
            positions[detailNodeId] = {
              x: coord.position.x,
              y: coord.position.y + 200
            };
          }
        }
      });
    }
    
    console.log('');
    console.log('📊 Toplanan Pozisyonlar:');
    console.log('  - Management:', orgData.management?.length || 0);
    console.log('  - Executives:', orgData.executives?.length || 0);
    console.log('  - Main Coordinators:', orgData.mainCoordinators?.length || 0);
    console.log('  - Coordinators:', orgData.coordinators?.length || 0);
    console.log('  - Toplam Node Pozisyonu:', Object.keys(positions).length);
    console.log('');
    
    // Firebase'deki mevcut pozisyonları kontrol et
    const existingSnapshot = await get(ref(database, `positions/${projectId}`));
    const existingPositions = existingSnapshot.exists() ? existingSnapshot.val() : {};
    
    console.log('📥 Firebase\'deki mevcut pozisyonlar:', Object.keys(existingPositions).length);
    
    // Yeni pozisyonları mevcut pozisyonlarla birleştir (yeni olanlar öncelikli)
    const mergedPositions = {
      ...existingPositions,
      ...positions
    };
    
    console.log('📤 Firebase\'e yazılacak toplam pozisyon:', Object.keys(mergedPositions).length);
    
    // Firebase'e yaz
    await set(ref(database, `positions/${projectId}`), mergedPositions);
    
    console.log('');
    console.log('✅✅✅ POZİSYONLAR FIREBASE\'E BAŞARIYLA YÜKLENDİ! ✅✅✅');
    console.log('📍 Project ID:', projectId);
    console.log('  - Yeni eklenen pozisyonlar:', Object.keys(positions).length);
    console.log('  - Toplam pozisyon (Firebase\'de):', Object.keys(mergedPositions).length);
    console.log('');
    console.log('🎉 BAŞARILI! Tüm pozisyonlar Firebase\'e yüklendi. Canlıda görünecek.');
    console.log('');
    console.log('💡 Şimdi org.json verilerini de sync etmek için:');
    console.log('   node scripts/sync-to-firebase.js');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase\'e pozisyon yükleme hatası:', error);
    process.exit(1);
  }
}

syncPositionsToFirebase();
