// iller.json'daki verileri org.json ve Firebase'e sync etme scripti
// NOT: Bu script ana dizinde çalıştırılmalı (node_modules için)
const fs = require('fs');
const path = require('path');

async function syncCityPersonnel() {
  try {
    // Firebase modülünü dinamik olarak yükle (ana dizinde çalıştırıldığında)
    let firebaseModule = null;
    let database = null;
    let firebaseSet = null;
    let firebaseGet = null;
    let firebaseRef = null;
    
    try {
      firebaseModule = require('firebase/app');
      const firebaseDatabase = require('firebase/database');
      firebaseSet = firebaseDatabase.set;
      firebaseGet = firebaseDatabase.get;
      firebaseRef = firebaseDatabase.ref;
      
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
      
      const app = firebaseModule.initializeApp(firebaseConfig);
      database = firebaseDatabase.getDatabase(app);
    } catch (fbError) {
      console.log('⚠️ Firebase modülü yüklenemedi (normal, sadece org.json güncellenecek)');
    }
    
    console.log('🚀 İL SORUMLUSU VE DENEYAP SORUMLUSU SYNC BAŞLIYOR...\n');
    console.log('🚀 İL SORUMLUSU VE DENEYAP SORUMLUSU SYNC BAŞLIYOR...\n');
    
    const illerJsonPath = path.join(__dirname, '..', 'iller.json');
    const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
    const projectId = 'main';

    console.log('📥 iller.json dosyası okunuyor...');
    const illerData = JSON.parse(fs.readFileSync(illerJsonPath, 'utf8'));
    console.log('  - Toplam kayıt:', illerData.length);

    console.log('📥 org.json dosyası okunuyor...');
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
    console.log('  - Mevcut cityPersonnel sayısı:', orgData.cityPersonnel?.length || 0);

    // Şehir adlarını normalize et
    const normalizeCityName = (cityName) => {
      if (!cityName || cityName === 'null' || cityName === '#N/A') return null;
      return cityName.trim();
    };

    // Şehir bazında grupla
    const cityMap = new Map();

    illerData.forEach((item, index) => {
      let cityName = normalizeCityName(item['İL']);
      
      // İL null ise, GÖREVİ'nden şehir adını çıkar
      if (!cityName) {
        const gorev = item['GÖREVİ'] || '';
        // Örnek: "AFYON T3 VAKFI DENEYAP SORUMLUSU" -> "AFYON"
        // Örnek: "ANKARA T3 VAKFI DENEYAP SORUMLUSU" -> "ANKARA"
        const cityMatch = gorev.match(/^([A-ZÇĞİÖŞÜ]+)\s+(T3|İL|DENEYAP)/i);
        if (cityMatch && cityMatch[1]) {
          cityName = normalizeCityName(cityMatch[1]);
        }
      }
      
      if (!cityName) {
        return; // Şehir adı bulunamadı, atla
      }
      
      if (!cityMap.has(cityName)) {
        cityMap.set(cityName, { city: cityName, ilSorumlusu: null, deneyapSorumlusu: null });
      }
      
      const cityData = cityMap.get(cityName);
      const gorev = item['GÖREVİ'] || '';
      const adSoyad = item['AD SOYAD'] || '';
      const department = item['null'] && item['null'] !== '#N/A' && item['null'] !== 'null' && item['null'] !== null ? item['null'] : undefined;
      
      // İl Sorumlusu kontrolü
      if (gorev.includes('İL SORUMLUSU') || gorev.includes('VEKALETEN')) {
        // Eğer zaten il sorumlusu varsa ve bu vekaleten değilse, vekaleten'i ekleme
        if (!cityData.ilSorumlusu || gorev.includes('VEKALETEN')) {
          cityData.ilSorumlusu = {
            id: `il-sorumlusu-${cityName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: adSoyad,
            title: gorev.includes('VEKALETEN') ? 'İL SORUMLUSU (VEKALETEN)' : 'İL SORUMLUSU',
            department: department,
          };
        }
      } 
      // Deneyap Sorumlusu kontrolü
      else if (gorev.includes('DENEYAP')) {
        cityData.deneyapSorumlusu = {
          id: `deneyap-sorumlusu-${cityName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          name: adSoyad,
          title: 'DENEYAP SORUMLUSU',
          department: department,
        };
      }
    });

    // cityPersonnel array'ini oluştur
    const newCityPersonnel = Array.from(cityMap.values())
      .filter(city => city.ilSorumlusu || city.deneyapSorumlusu) // En az bir sorumlu olan şehirler
      .map((city, index) => {
        const cityPersonnel = {
          city: city.city,
          id: `city-${city.city.toLowerCase().replace(/\s+/g, '-')}`,
        };
        
        if (city.ilSorumlusu) {
          cityPersonnel.ilSorumlusu = city.ilSorumlusu;
        }
        
        if (city.deneyapSorumlusu) {
          cityPersonnel.deneyapSorumlusu = city.deneyapSorumlusu;
        }
        
        return cityPersonnel;
      })
      .sort((a, b) => a.city.localeCompare(b.city, 'tr')); // Türkçe alfabetik sıralama

    console.log('');
    console.log('📊 İstatistikler:');
    console.log('  - iller.json\'dan işlenen kayıt:', illerData.length);
    console.log('  - Oluşturulan şehir sayısı:', newCityPersonnel.length);
    console.log('  - İl sorumlusu olan şehir:', newCityPersonnel.filter(c => c.ilSorumlusu).length);
    console.log('  - Deneyap sorumlusu olan şehir:', newCityPersonnel.filter(c => c.deneyapSorumlusu).length);
    console.log('  - Her ikisi de olan şehir:', newCityPersonnel.filter(c => c.ilSorumlusu && c.deneyapSorumlusu).length);
    console.log('');

    // Yedekleme
    const backupPath = path.join(__dirname, '..', 'data', `org.json.backup.${Date.now()}`);
    fs.copyFileSync(orgJsonPath, backupPath);
    console.log(`💾 Yedek oluşturuldu: ${backupPath}`);

    // org.json'ı güncelle
    orgData.cityPersonnel = newCityPersonnel;

    // org.json'a yaz
    fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf8');
    console.log('✅ org.json güncellendi!');

    // Firebase'e yaz (eğer modül yüklendiyse)
    if (firebaseModule && database && firebaseSet && firebaseGet && firebaseRef) {
      console.log('\n📤 Firebase\'e yazılıyor...');
      await firebaseSet(firebaseRef(database, `orgData/${projectId}`), orgData);
      console.log('✅ Firebase\'e yazıldı!');

      // Firebase'den oku ve doğrula
      console.log('\n🔍 Firebase\'den doğrulama...');
      const snapshot = await firebaseGet(firebaseRef(database, `orgData/${projectId}/cityPersonnel`));
      const firebaseCityPersonnel = snapshot.val();
      console.log('  - Firebase\'deki cityPersonnel sayısı:', Array.isArray(firebaseCityPersonnel) ? firebaseCityPersonnel.length : Object.keys(firebaseCityPersonnel || {}).length);
    } else {
      console.log('\n⚠️ Firebase modülü bulunamadı. Sadece org.json güncellendi.');
      console.log('   Firebase\'e yazmak için: node scripts/force-sync-firebase.js');
    }

    console.log('');
    console.log('✅✅✅ SYNC TAMAMLANDI! ✅✅✅');
    console.log('📍 org.json:', orgJsonPath);
    console.log('📍 Firebase:', `orgData/${projectId}/cityPersonnel`);
    console.log('  - Toplam şehir:', newCityPersonnel.length);
    console.log('');
    console.log('🎉 BAŞARILI! iller.json verileri org.json ve Firebase\'e aktarıldı.');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncCityPersonnel();
