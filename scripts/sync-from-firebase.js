// Firebase'den veri çekip org.json'a yazma scripti
// Kullanım: node scripts/sync-from-firebase.js
// Bu script Firebase'deki mevcut verileri org.json'a yazar
// Böylece canlıda yaptığınız değişiklikler korunur

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

async function syncFromFirebase() {
  try {
    const projectId = 'main';
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    
    console.log('📥 Firebase\'den veriler çekiliyor...');
    console.log('  - Project ID:', projectId);
    
    // Firebase'den verileri çek
    const snapshot = await get(ref(database, `orgData/${projectId}`));
    
    if (!snapshot.exists()) {
      console.error('❌ Firebase\'de veri bulunamadı!');
      process.exit(1);
    }
    
    let firebaseData = snapshot.val();
    
    // Veri yapısını normalize et - coordinators array veya object olabilir
    if (firebaseData.coordinators && !Array.isArray(firebaseData.coordinators) && typeof firebaseData.coordinators === 'object') {
      console.log('🔄 Coordinators object formatında, array\'e çevriliyor...');
      firebaseData = {
        ...firebaseData,
        coordinators: Object.values(firebaseData.coordinators)
      };
    }
    
    // Executives array veya object olabilir - normalize et
    if (firebaseData.executives && !Array.isArray(firebaseData.executives) && typeof firebaseData.executives === 'object') {
      console.log('🔄 Executives object formatında, array\'e çevriliyor...');
      firebaseData = {
        ...firebaseData,
        executives: Object.values(firebaseData.executives)
      };
    }
    
    // Array'leri normalize et
    if (!firebaseData.coordinators) firebaseData.coordinators = [];
    if (!firebaseData.management) firebaseData.management = [];
    if (!firebaseData.executives) firebaseData.executives = [];
    if (!firebaseData.mainCoordinators) firebaseData.mainCoordinators = [];
    if (!firebaseData.cityPersonnel) firebaseData.cityPersonnel = [];
    
    console.log('  - Coordinators:', firebaseData.coordinators?.length || 0);
    console.log('  - Management:', firebaseData.management?.length || 0);
    console.log('  - Executives:', firebaseData.executives?.length || 0);
    console.log('  - Main Coordinators:', firebaseData.mainCoordinators?.length || 0);
    console.log('  - City Personnel:', firebaseData.cityPersonnel?.length || 0);
    
    // Yedekleme: Mevcut org.json'ı yedekle
    const backupPath = path.join(__dirname, '..', 'data', `org.json.backup.${Date.now()}`);
    if (fs.existsSync(orgJsonPath)) {
      fs.copyFileSync(orgJsonPath, backupPath);
      console.log(`  💾 Yedek oluşturuldu: ${backupPath}`);
    }
    
    // org.json'a yaz
    fs.writeFileSync(orgJsonPath, JSON.stringify(firebaseData, null, 2), 'utf8');
    console.log('');
    console.log('✅✅✅ FIREBASE\'DEN VERİLER ORG.JSON\'A YAZILDI! ✅✅✅');
    console.log('📍 Dosya:', orgJsonPath);
    console.log('  - Coordinators:', firebaseData.coordinators?.length || 0);
    console.log('  - City Personnel:', firebaseData.cityPersonnel?.length || 0);
    console.log('');
    console.log('🎉 BAŞARILI! Artık org.json Firebase\'deki güncel verileri içeriyor.');
    console.log('💡 Şimdi git commit ve push yapabilirsiniz.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase\'den yükleme hatası:', error);
    process.exit(1);
  }
}

syncFromFirebase();
