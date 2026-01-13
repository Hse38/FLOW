// Firebase'deki pozisyonları kontrol etme scripti
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

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

async function checkPositions() {
  try {
    const projectId = 'main';
    const snapshot = await get(ref(database, `positions/${projectId}`));
    
    if (!snapshot.exists()) {
      console.log('❌ Firebase\'de pozisyon yok!');
      return;
    }
    
    const positions = snapshot.val();
    const positionKeys = Object.keys(positions);
    
    console.log('✅ Firebase\'deki Pozisyonlar:');
    console.log('  - Toplam:', positionKeys.length);
    console.log('');
    
    // Kategorilere ayır
    const regularNodes = positionKeys.filter(k => !k.startsWith('detail-'));
    const detailNodes = positionKeys.filter(k => k.startsWith('detail-'));
    
    console.log('📊 Kategoriler:');
    console.log('  - Normal node\'lar:', regularNodes.length);
    console.log('  - Expanded detail node\'lar:', detailNodes.length);
    console.log('');
    
    if (detailNodes.length > 0) {
      console.log('🔍 Expanded Detail Node\'lar:');
      detailNodes.forEach(key => {
        console.log(`  - ${key}: (${positions[key].x}, ${positions[key].y})`);
      });
    }
    
    console.log('');
    console.log('📋 Tüm Pozisyonlar:');
    positionKeys.forEach(key => {
      console.log(`  - ${key}: (${positions[key].x}, ${positions[key].y})`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

checkPositions();
