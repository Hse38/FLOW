// iller.json'daki verileri org.json'daki cityPersonnel formatına dönüştürme scripti
const fs = require('fs');
const path = require('path');

try {
  const illerJsonPath = path.join(__dirname, '..', 'iller.json');
  const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');

  console.log('📥 iller.json dosyası okunuyor...');
  const illerData = JSON.parse(fs.readFileSync(illerJsonPath, 'utf8'));
  console.log('  - Toplam kayıt:', illerData.length);

  console.log('📥 org.json dosyası okunuyor...');
  const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));
  console.log('  - Mevcut cityPersonnel sayısı:', orgData.cityPersonnel?.length || 0);

  // Şehir adlarını normalize et
  const normalizeCityName = (cityName) => {
    if (!cityName || cityName === 'null' || cityName === '#N/A') return null;
    // Türkçe karakterleri koruyarak normalize et
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
    
    if (gorev.includes('İL SORUMLUSU') || gorev.includes('VEKALETEN')) {
      // Eğer zaten il sorumlusu varsa ve bu vekaleten değilse, vekaleten'i ekleme
      if (!cityData.ilSorumlusu || gorev.includes('VEKALETEN')) {
        cityData.ilSorumlusu = {
          id: `person-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          name: adSoyad,
          title: gorev.includes('VEKALETEN') ? 'İL SORUMLUSU (VEKALETEN)' : 'İL SORUMLUSU',
          department: department,
        };
      }
    } else if (gorev.includes('DENEYAP')) {
      // Eğer zaten deneyap sorumlusu varsa, güncelleme
      cityData.deneyapSorumlusu = {
        id: `person-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
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
        id: `city-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
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

  console.log('');
  console.log('✅✅✅ CITY PERSONNEL GÜNCELLENDİ! ✅✅✅');
  console.log('📍 Dosya:', orgJsonPath);
  console.log('  - Toplam şehir:', newCityPersonnel.length);
  console.log('  - Eski şehir sayısı:', orgData.cityPersonnel?.length || 0);
  console.log('');
  console.log('🎉 BAŞARILI! iller.json verileri org.json\'a aktarıldı.');
  
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.error(error.stack);
  process.exit(1);
}
