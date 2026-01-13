// Firebase'i TAMAMEN SIFIRLA ve org.json'dan verileri yükle
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, remove, get } = require('firebase/database');
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

async function resetFirebase() {
  try {
    const projectId = 'main';
    
    console.log('🔥 FIREBASE SIFIRLANIYOR...\n');
    
    // 1. TÜM VERİLERİ SİL
    console.log('🗑️  Firebase\'deki tüm veriler siliniyor...');
    
    // orgData sil
    await remove(ref(database, `orgData/${projectId}`));
    console.log('  ✅ orgData silindi');
    
    // positions sil
    await remove(ref(database, `positions/${projectId}`));
    console.log('  ✅ positions silindi');
    
    // connections sil
    await remove(ref(database, `connections/${projectId}`));
    console.log('  ✅ connections silindi');
    
    // projects sil
    await remove(ref(database, 'projects'));
    console.log('  ✅ projects silindi');
    
    // settings sil
    await remove(ref(database, 'settings'));
    console.log('  ✅ settings silindi');
    
    console.log('\n✅ Firebase TAMAMEN SIFIRLANDI!\n');
    
    // 2. org.json'dan verileri yükle
    console.log('📤 org.json\'dan veriler yükleniyor...\n');
    
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    
    console.log('📊 ORG.JSON VERİLERİ:');
    console.log('  - Coordinators:', orgData.coordinators?.length || 0);
    console.log('  - Executives:', orgData.executives?.length || 0);
    console.log('  - Main Coordinators:', orgData.mainCoordinators?.length || 0);
    console.log('  - City Personnel:', orgData.cityPersonnel?.length || 0);
    
    // DENEYAP Kart kontrolü
    const deneyapKart = orgData.coordinators?.find(c => c.id === 'deneyap-kart');
    if (deneyapKart) {
      console.log('\n✅ DENEYAP Kart Birimi (org.json):');
      console.log('  - Alt Birimler:', deneyapKart.subUnits?.length || 0);
      const totalPeople = deneyapKart.subUnits?.reduce((sum, sub) => sum + (sub.people?.length || 0), 0) || 0;
      console.log('  - Toplam Personel:', totalPeople);
      if (deneyapKart.subUnits) {
        deneyapKart.subUnits.forEach((sub, i) => {
          console.log(`    ${i+1}. ${sub.title}: ${sub.people?.length || 0} personel`);
          if (sub.people) {
            sub.people.forEach(p => console.log(`       - ${p.name}`));
          }
        });
      }
    }
    
    // Teknofest Fuar kontrolü
    const teknofestFuar = orgData.coordinators?.find(c => c.id === 'teknofest-fuar');
    if (teknofestFuar) {
      console.log('\n✅ Teknofest Fuar Koordinatörlüğü (org.json):');
      console.log('  - Koordinatör:', teknofestFuar.coordinator?.name || 'YOK');
      console.log('  - Alt Birimler:', teknofestFuar.subUnits?.length || 0);
      const totalPeople = teknofestFuar.subUnits?.reduce((sum, sub) => sum + (sub.people?.length || 0), 0) || 0;
      console.log('  - Toplam Personel:', totalPeople);
      if (teknofestFuar.subUnits) {
        teknofestFuar.subUnits.forEach((sub, i) => {
          console.log(`    ${i+1}. ${sub.title}: ${sub.people?.length || 0} personel`);
          if (sub.people) {
            sub.people.forEach(p => console.log(`       - ${p.name}`));
          }
        });
      }
    }
    
    // 3. Firebase'e YAZ
    console.log('\n📤 Firebase\'e yazılıyor...');
    await set(ref(database, `orgData/${projectId}`), orgData);
    console.log('  ✅ orgData Firebase\'e yüklendi');
    
    // Main project oluştur
    await set(ref(database, 'projects/main'), {
      id: 'main',
      name: 'Ana Şema',
      createdAt: Date.now(),
      isMain: true
    });
    console.log('  ✅ main project oluşturuldu');
    
    // Settings oluştur
    await set(ref(database, 'settings/activeProjectId'), projectId);
    await set(ref(database, 'settings/locked'), false);
    console.log('  ✅ settings oluşturuldu');
    
    // 4. DOĞRULAMA
    console.log('\n🔍 Firebase\'den doğrulama yapılıyor...');
    const snapshot = await get(ref(database, `orgData/${projectId}`));
    
    if (snapshot.exists()) {
      const fbData = snapshot.val();
      console.log('✅✅✅ FIREBASE\'E VERİLER YÜKLENDİ! ✅✅✅\n');
      console.log('📊 FIREBASE VERİLERİ:');
      console.log('  - Coordinators:', fbData.coordinators?.length || 0);
      console.log('  - Executives:', fbData.executives?.length || 0);
      console.log('  - Main Coordinators:', fbData.mainCoordinators?.length || 0);
      console.log('  - City Personnel:', fbData.cityPersonnel?.length || 0);
      
      // DENEYAP Kart doğrulama
      const fbDeneyap = fbData.coordinators?.find(c => c.id === 'deneyap-kart');
      if (fbDeneyap) {
        console.log('\n✅ DENEYAP Kart Birimi (Firebase):');
        console.log('  - Alt Birimler:', fbDeneyap.subUnits?.length || 0);
        const totalPeople = fbDeneyap.subUnits?.reduce((sum, sub) => sum + (sub.people?.length || 0), 0) || 0;
        console.log('  - Toplam Personel:', totalPeople);
        if (fbDeneyap.subUnits) {
          fbDeneyap.subUnits.forEach((sub, i) => {
            console.log(`    ${i+1}. ${sub.title}: ${sub.people?.length || 0} personel`);
          });
        }
      }
      
      // Teknofest Fuar doğrulama
      const fbTeknofest = fbData.coordinators?.find(c => c.id === 'teknofest-fuar');
      if (fbTeknofest) {
        console.log('\n✅ Teknofest Fuar Koordinatörlüğü (Firebase):');
        console.log('  - Koordinatör:', fbTeknofest.coordinator?.name || 'YOK');
        console.log('  - Alt Birimler:', fbTeknofest.subUnits?.length || 0);
        const totalPeople = fbTeknofest.subUnits?.reduce((sum, sub) => sum + (sub.people?.length || 0), 0) || 0;
        console.log('  - Toplam Personel:', totalPeople);
        if (fbTeknofest.subUnits) {
          fbTeknofest.subUnits.forEach((sub, i) => {
            console.log(`    ${i+1}. ${sub.title}: ${sub.people?.length || 0} personel`);
          });
        }
      }
      
      console.log('\n🎉🎉🎉 FIREBASE TAMAMEN SIFIRLANDI VE YENİDEN YÜKLENDİ! 🎉🎉🎉');
      console.log('✅ Tüm veriler Firebase\'de!');
      console.log('✅ Production\'da (canlıda) otomatik olarak Firebase\'den yüklenecek!');
    } else {
      console.error('❌ DOĞRULAMA: Firebase\'de veri bulunamadı!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ HATA:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetFirebase();
