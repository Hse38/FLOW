// Firebase'deki pozisyonları org.json'a yazma scripti
// Bu script Firebase'deki canlı pozisyonları org.json'daki node'ların position değerlerine yazar
// Kullanım: node scripts/sync-positions-from-firebase.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
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

async function syncPositionsFromFirebase() {
  try {
    const projectId = 'main';
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    
    console.log('📥 Firebase\'den pozisyonlar çekiliyor...');
    console.log('  - Project ID:', projectId);
    
    // Firebase'den pozisyonları çek
    const positionsSnapshot = await get(ref(database, `positions/${projectId}`));
    
    if (!positionsSnapshot.exists()) {
      console.error('❌ Firebase\'de pozisyon bulunamadı!');
      process.exit(1);
    }
    
    const firebasePositions = positionsSnapshot.val();
    console.log('  - Firebase\'deki pozisyon sayısı:', Object.keys(firebasePositions).length);
    console.log('');
    
    // org.json dosyasını oku
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    
    let updatedCount = 0;
    
    // Management pozisyonlarını güncelle
    if (orgData.management && Array.isArray(orgData.management)) {
      orgData.management.forEach(item => {
        if (item.id && firebasePositions[item.id]) {
          const newPos = firebasePositions[item.id];
          if (item.position.x !== newPos.x || item.position.y !== newPos.y) {
            item.position = newPos;
            updatedCount++;
            console.log(`  📍 Management güncellendi: ${item.id} -> (${newPos.x}, ${newPos.y})`);
          }
        }
      });
    }
    
    // Executives pozisyonlarını güncelle
    if (orgData.executives && Array.isArray(orgData.executives)) {
      orgData.executives.forEach(exec => {
        if (exec.id && firebasePositions[exec.id]) {
          const newPos = firebasePositions[exec.id];
          if (exec.position.x !== newPos.x || exec.position.y !== newPos.y) {
            exec.position = newPos;
            updatedCount++;
            console.log(`  📍 Executive güncellendi: ${exec.id} -> (${newPos.x}, ${newPos.y})`);
          }
        }
      });
    }
    
    // Main Coordinators pozisyonlarını güncelle
    if (orgData.mainCoordinators && Array.isArray(orgData.mainCoordinators)) {
      orgData.mainCoordinators.forEach(coord => {
        if (coord.id && firebasePositions[coord.id]) {
          const newPos = firebasePositions[coord.id];
          if (coord.position.x !== newPos.x || coord.position.y !== newPos.y) {
            coord.position = newPos;
            updatedCount++;
            console.log(`  📍 MainCoordinator güncellendi: ${coord.id} -> (${newPos.x}, ${newPos.y})`);
          }
        }
      });
    }
    
    // Coordinators pozisyonlarını güncelle
    if (orgData.coordinators && Array.isArray(orgData.coordinators)) {
      orgData.coordinators.forEach(coord => {
        if (coord.id && firebasePositions[coord.id]) {
          const newPos = firebasePositions[coord.id];
          if (coord.position.x !== newPos.x || coord.position.y !== newPos.y) {
            coord.position = newPos;
            updatedCount++;
            console.log(`  📍 Coordinator güncellendi: ${coord.id} -> (${newPos.x}, ${newPos.y})`);
          }
        }
      });
    }
    
    // Yedekleme: Mevcut org.json'ı yedekle
    const backupPath = path.join(__dirname, '..', 'data', `org.json.backup.${Date.now()}`);
    if (fs.existsSync(orgJsonPath)) {
      fs.copyFileSync(orgJsonPath, backupPath);
      console.log(`  💾 Yedek oluşturuldu: ${backupPath}`);
    }
    
    // org.json'a yaz
    fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf8');
    
    console.log('');
    console.log('✅✅✅ POZİSYONLAR ORG.JSON\'A YAZILDI! ✅✅✅');
    console.log('📍 Dosya:', orgJsonPath);
    console.log('  - Güncellenen node sayısı:', updatedCount);
    console.log('  - Toplam Firebase pozisyonu:', Object.keys(firebasePositions).length);
    console.log('');
    console.log('🎉 BAŞARILI! Artık org.json Firebase\'deki canlı pozisyonları içeriyor.');
    console.log('💡 Şimdi git commit ve push yapabilirsiniz.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase\'den pozisyon yükleme hatası:', error);
    process.exit(1);
  }
}

syncPositionsFromFirebase();
