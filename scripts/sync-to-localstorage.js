// localStorage'a verileri yükleme scripti (localhost için)
const fs = require('fs');
const path = require('path');

// org.json dosyasını oku
const orgJsonPath = path.join(__dirname, '..', 'data', 'org.json');
const orgData = JSON.parse(fs.readFileSync(orgJsonPath, 'utf8'));

console.log('📤 localStorage\'a yükleniyor...');
console.log('  - Coordinators:', orgData.coordinators?.length || 0);

// localStorage'a yazmak için HTML dosyası oluştur (tarayıcıda çalıştırılacak)
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>localStorage Yükle</title>
</head>
<body>
  <h1>localStorage'a Veri Yükleme</h1>
  <button onclick="loadData()">Verileri Yükle</button>
  <pre id="output"></pre>
  
  <script>
    const orgData = ${JSON.stringify(orgData, null, 2)};
    
    function loadData() {
      try {
        localStorage.setItem('orgData_main', JSON.stringify(orgData));
        const output = document.getElementById('output');
        output.textContent = '✅ Veriler localStorage\'a yüklendi!\\n\\n' +
          'Coordinators: ' + orgData.coordinators?.length + '\\n' +
          'DENEYAP Kart alt birimler: ' + (orgData.coordinators?.find(c => c.id === 'deneyap-kart')?.subUnits?.length || 0);
      } catch (e) {
        document.getElementById('output').textContent = '❌ Hata: ' + e.message;
      }
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'localstorage-loader.html'), htmlContent);
console.log('✅ HTML dosyası oluşturuldu: localstorage-loader.html');
console.log('   Bu dosyayı tarayıcıda açıp "Verileri Yükle" butonuna tıklayın!');
