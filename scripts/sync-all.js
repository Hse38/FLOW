// Hem Firebase hem localStorage'a veri yükleme
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

async function syncAll() {
  try {
    console.log('🚀 TÜM VERİLER YÜKLENİYOR...\n');
    
    const projectId = 'main';
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    
    console.log('📊 ORG.JSON VERİLERİ:');
    console.log('  - Coordinators:', orgData.coordinators?.length || 0);
    
    // Firebase'e yaz
    console.log('\n📤 Firebase\'e yazılıyor...');
    await set(ref(database, `orgData/${projectId}`), orgData);
    console.log('✅ Firebase\'e yazıldı!');
    
    // Doğrulama
    const snapshot = await get(ref(database, `orgData/${projectId}`));
    if (snapshot.exists()) {
      const fbData = snapshot.val();
      console.log('✅ Firebase doğrulama: Coordinators:', fbData.coordinators?.length || 0);
    }
    
    // localStorage için HTML oluştur
    const htmlContent = `<!DOCTYPE html>
<html>
<head><title>localStorage Yükle</title></head>
<body style="font-family: Arial; padding: 20px;">
  <h1>localStorage'a Veri Yükleme</h1>
  <button onclick="loadData()" style="padding: 10px 20px; font-size: 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Verileri Yükle</button>
  <pre id="output" style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;"></pre>
  
  <script>
    const orgData = ${JSON.stringify(orgData, null, 2)};
    
    function loadData() {
      try {
        localStorage.setItem('orgData_main', JSON.stringify(orgData));
        const deneyap = orgData.coordinators?.find(c => c.id === 'deneyap-kart');
        const teknofest = orgData.coordinators?.find(c => c.id === 'teknofest-fuar');
        const output = document.getElementById('output');
        output.textContent = '✅✅✅ VERİLER LOCALSTORAGE\'A YÜKLENDİ! ✅✅✅\\n\\n' +
          'Coordinators: ' + orgData.coordinators?.length + '\\n' +
          'DENEYAP Kart: ' + (deneyap?.subUnits?.length || 0) + ' alt birim, ' + 
          (deneyap?.subUnits?.reduce((sum, sub) => sum + (sub.people?.length || 0), 0) || 0) + ' personel\\n' +
          'Teknofest Fuar: ' + (teknofest?.subUnits?.length || 0) + ' alt birim, ' + 
          (teknofest?.subUnits?.reduce((sum, sub) => sum + (sub.people?.length || 0), 0) || 0) + ' personel\\n\\n' +
          'Şimdi sayfayı yenileyin!';
      } catch (e) {
        document.getElementById('output').textContent = '❌ Hata: ' + e.message;
      }
    }
  </script>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, '..', 'localstorage-loader.html'), htmlContent);
    console.log('\n✅ localStorage yükleyici oluşturuldu: localstorage-loader.html');
    console.log('   Bu dosyayı tarayıcıda açıp "Verileri Yükle" butonuna tıklayın!');
    console.log('\n🎉 TAMAMLANDI!');
    console.log('   1. Firebase\'e yüklendi ✅');
    console.log('   2. localStorage-loader.html dosyasını açıp verileri yükleyin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ HATA:', error.message);
    process.exit(1);
  }
}

syncAll();
