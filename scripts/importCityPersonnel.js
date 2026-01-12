/**
 * CSV'den İl Sorumlusu ve Deneyap Sorumlusu verilerini içe aktarma scripti
 * 
 * Kullanım:
 * node scripts/importCityPersonnel.js
 */

const fs = require('fs');
const path = require('path');

// CSV dosyasını oku - farklı encoding'leri dene
let csvContent;
let encodingUsed = '';
// Desktop'taki dosyayı oku
const csvPath = 'c:\\Users\\T3 Vakfı\\Desktop\\VERİ!.csv';
const encodings = ['windows-1254', 'latin1', 'utf-8', 'cp1254', 'iso-8859-9'];

for (const enc of encodings) {
  try {
    csvContent = fs.readFileSync(csvPath, enc);
    encodingUsed = enc;
    console.log(`✅ CSV dosyası okundu (encoding: ${enc}):`, csvPath);
    break;
  } catch (e) {
    // Bu encoding ile okunamadı, bir sonrakini dene
    continue;
  }
}

// Hala okunamadıysa alternatif yolları dene
if (!csvContent) {
  const altPath = path.join(__dirname, '../../VERİ!.csv');
  for (const enc of encodings) {
    try {
      csvContent = fs.readFileSync(altPath, enc);
      encodingUsed = enc;
      console.log(`✅ Alternatif yoldan okundu (encoding: ${enc}):`, altPath);
      break;
    } catch (e) {
      continue;
    }
  }
}

if (!csvContent) {
  console.error('❌ CSV dosyası hiçbir encoding ile okunamadı:', csvPath);
  process.exit(1);
}

// İl adlarını normalize et (büyük harften baş harf büyük harfe çevir)
function normalizeCityName(cityName) {
  if (!cityName) return '';
  // Parantez içindeki bilgileri koru (örn: KOCAELİ (İZMİT))
  const parts = cityName.split(' (');
  const mainCity = parts[0];
  const suffix = parts.length > 1 ? ' (' + parts.slice(1).join(' (') : '';
  
  // Türkçe karakterleri düzelt
  let normalized = mainCity
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Türkçe özel karakterler için büyük harf düzeltmeleri
  const turkishChars = {
    'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç'
  };
  
  // İlk harf için düzeltme
  if (normalized.length > 0) {
    const firstChar = normalized[0];
    if (turkishChars[firstChar.toLowerCase()]) {
      normalized = turkishChars[firstChar.toLowerCase()] + normalized.slice(1);
    }
  }
  
  return normalized + suffix;
}

// Karakter kodlamasını düzelt - Basit düzeltme, zaten doğru encoding ile okunmuş olmalı
function fixEncoding(text) {
  if (!text) return '';
  // Eğer windows-1254 ile okunduysa zaten doğru olmalı
  // Sadece trim yap
  return text.trim();
}

// CSV'yi parse et
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(';').map(h => h.trim());

// Kolon indeksleri (karakter kodlaması sorunlarına rağmen)
// 0: İL, 1: İL SORUMLUSU, 2: DENEYAP SORUMLUSU, 3: İL SORUMLUSU ÜNİVERSİTE, 
// 4: İL SORUMLUSU BÖLÜM, 5: DENEYAP SORUMLUSU ÜNİVERSİTE, 6: DENEYAP SORUMLUSU BÖLÜM
const data = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';').map(c => c.trim());
  if (cols[0] && cols[0] !== '') {
    const cityName = normalizeCityName(fixEncoding(cols[0]));
    data.push({
      city: cityName,
      ilSorumlusu: {
        name: cols[1] ? fixEncoding(cols[1]).trim() : null,
        university: cols[3] ? fixEncoding(cols[3]).trim() : null,
        department: cols[4] ? fixEncoding(cols[4]).trim() : null
      },
      deneyapSorumlusu: {
        name: cols[2] ? fixEncoding(cols[2]).trim() : null,
        university: cols[5] ? fixEncoding(cols[5]).trim() : null,
        department: cols[6] ? fixEncoding(cols[6]).trim() : null
      }
    });
  }
}

// JSON formatında çıktı - her satır için benzersiz ID oluştur
let personCounter = 1;
const output = {
  cityPersonnel: data.filter(item => item.ilSorumlusu.name || item.deneyapSorumlusu.name).map((item, index) => {
    const cityData = {
      id: `city-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      city: item.city,
      people: [] // Geriye uyumluluk için boş array
    };
    
    if (item.ilSorumlusu.name && item.ilSorumlusu.name.trim() !== '') {
      cityData.ilSorumlusu = {
        id: `person-${Date.now()}-${personCounter++}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.ilSorumlusu.name.trim(),
        title: 'İl Sorumlusu',
        university: item.ilSorumlusu.university && item.ilSorumlusu.university.trim() !== '' ? item.ilSorumlusu.university.trim() : undefined,
        department: item.ilSorumlusu.department && item.ilSorumlusu.department.trim() !== '' ? item.ilSorumlusu.department.trim() : undefined
      };
    }
    
    if (item.deneyapSorumlusu.name && item.deneyapSorumlusu.name.trim() !== '') {
      cityData.deneyapSorumlusu = {
        id: `person-${Date.now()}-${personCounter++}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.deneyapSorumlusu.name.trim(),
        title: 'Deneyap Sorumlusu',
        university: item.deneyapSorumlusu.university && item.deneyapSorumlusu.university.trim() !== '' ? item.deneyapSorumlusu.university.trim() : undefined,
        department: item.deneyapSorumlusu.department && item.deneyapSorumlusu.department.trim() !== '' ? item.deneyapSorumlusu.department.trim() : undefined
      };
    }
    
    return cityData;
  })
};

// İstatistikler
const ilSorumlusuCount = output.cityPersonnel.filter(cp => cp.ilSorumlusu).length;
const deneyapSorumlusuCount = output.cityPersonnel.filter(cp => cp.deneyapSorumlusu).length;

// Sonucu göster
console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ CSV İÇE AKTARMA BAŞARILI!');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📊 Toplam ${output.cityPersonnel.length} şehir işlendi`);
console.log(`👤 İl Sorumlusu bulunan şehir: ${ilSorumlusuCount}`);
console.log(`🎓 Deneyap Sorumlusu bulunan şehir: ${deneyapSorumlusuCount}`);
console.log('═══════════════════════════════════════════════════════════\n');

// Dosyaya kaydet
const outputPath = path.join(__dirname, '../../importedCityPersonnel.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`✅ Veriler ${outputPath} dosyasına kaydedildi\n`);

// Ayrıca data/org.json dosyasını güncelle (eğer varsa)
const orgJsonPath = path.join(__dirname, '../../data/org.json');
try {
  if (fs.existsSync(orgJsonPath)) {
    const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf-8'));
    orgData.cityPersonnel = output.cityPersonnel;
    fs.writeFileSync(orgJsonPath, JSON.stringify(orgData, null, 2), 'utf-8');
    console.log(`✅ data/org.json dosyası güncellendi (cityPersonnel eklendi)\n`);
  } else {
    console.log(`ℹ️  data/org.json dosyası bulunamadı, sadece importedCityPersonnel.json oluşturuldu\n`);
  }
} catch (error) {
  console.warn(`⚠️  data/org.json güncellenirken hata oluştu:`, error.message);
  console.log(`   importedCityPersonnel.json dosyası kullanılabilir\n`);
}
