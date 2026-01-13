# Personel Bilgileri Yükleme Formatı

Bu doküman, personel bilgilerini ve CV'lerini toplu olarak yüklemek için kullanılan formatları açıklar.

## Yöntem 1: CSV Dosyası ile Yükleme

### CSV Formatı

CSV dosyanız şu kolonları içermelidir:

```csv
İsim,Email,Telefon,Üniversite,Bölüm,CV_Dosya_Yolu,Fotoğraf_Dosya_Yolu,Notlar,Görev_Tanımı
"Ahmet Yılmaz","ahmet@example.com","0532 123 45 67","İTÜ","Bilgisayar Mühendisliği","cv/ahmet-yilmaz.pdf","photos/ahmet.jpg","","Yazılım Geliştirme"
"Mehmet Demir","mehmet@example.com","0533 234 56 78","ODTÜ","Elektrik Mühendisliği","cv/mehmet-demir.pdf","","","Proje Yönetimi"
```

### Kolon Açıklamaları

- **İsim** (Zorunlu): Personelin tam adı. org.json'da bulunmalıdır.
- **Email** (Opsiyonel): E-posta adresi
- **Telefon** (Opsiyonel): Telefon numarası
- **Üniversite** (Opsiyonel): Mezun olduğu üniversite
- **Bölüm** (Opsiyonel): Mezun olduğu bölüm
- **CV_Dosya_Yolu** (Opsiyonel): CV dosyasının yolu (proje kök dizinine göre)
  - Örnek: `cv/ahmet-yilmaz.pdf`
  - Desteklenen formatlar: PDF, DOC, DOCX, JPG, PNG
- **Fotoğraf_Dosya_Yolu** (Opsiyonel): Fotoğraf dosyasının yolu
  - Desteklenen formatlar: JPG, PNG
- **Notlar** (Opsiyonel): Ek notlar
- **Görev_Tanımı** (Opsiyonel): İş kalemleri / görev tanımı

### Kullanım

```bash
node scripts/update-personnel-info.js personel-bilgileri.csv
```

## Yöntem 2: JSON Dosyası ile Yükleme

### JSON Formatı

```json
[
  {
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "phone": "0532 123 45 67",
    "university": "İTÜ",
    "department": "Bilgisayar Mühendisliği",
    "cvFilePath": "cv/ahmet-yilmaz.pdf",
    "photoFilePath": "photos/ahmet.jpg",
    "notes": "",
    "jobDescription": "Yazılım Geliştirme"
  },
  {
    "name": "Mehmet Demir",
    "email": "mehmet@example.com",
    "phone": "0533 234 56 78",
    "university": "ODTÜ",
    "department": "Elektrik Mühendisliği",
    "cvFilePath": "cv/mehmet-demir.pdf",
    "notes": "Proje Yönetimi Uzmanı"
  }
]
```

### Alan Açıklamaları

- `name` (Zorunlu): Personelin tam adı
- `email` (Opsiyonel): E-posta adresi
- `phone` (Opsiyonel): Telefon numarası
- `university` (Opsiyonel): Üniversite
- `department` (Opsiyonel): Bölüm
- `cvFilePath` (Opsiyonel): CV dosya yolu
- `photoFilePath` (Opsiyonel): Fotoğraf dosya yolu
- `notes` (Opsiyonel): Notlar
- `jobDescription` (Opsiyonel): Görev tanımı

### Kullanım

```bash
node scripts/update-personnel-info.js personel-bilgileri.json
```

## Dosya Yapısı Örneği

```
proje-kök-dizini/
├── scripts/
│   └── update-personnel-info.js
├── data/
│   └── org.json
├── cv-files/           # CV dosyalarınızı buraya koyun
│   ├── ahmet-yilmaz.pdf
│   ├── mehmet-demir.pdf
│   └── ...
├── photos/             # Fotoğrafları buraya koyun (opsiyonel)
│   ├── ahmet.jpg
│   └── ...
├── personel-bilgileri.csv  # veya .json
└── ...
```

## Örnek CSV Dosyası

Örnek bir CSV dosyası oluşturmak için `ornek-personel.csv` dosyasını inceleyebilirsiniz.

## Notlar

1. **İsim Eşleştirme**: Personelin ismi org.json'da tam olarak eşleşmelidir. Büyük/küçük harf duyarlı değildir.

2. **CV Dosya Boyutu**: CV dosyaları 5MB'dan küçük olmalıdır.

3. **Fotoğraf Boyutu**: Fotoğraflar 2MB'dan küçük olmalıdır.

4. **Base64 Encoding**: CV ve fotoğraflar Base64 formatında kaydedilir.

5. **Firebase'e Yükleme**: Verileri güncelledikten sonra Firebase'e yüklemek için:
   ```bash
   node scripts/sync-all.js
   ```

## Hata Ayıklama

Eğer bir personel bulunamazsa:
- İsmin org.json'da mevcut olduğundan emin olun
- Büyük/küçük harf farklılıklarını kontrol edin
- Özel karakterleri kontrol edin

Eğer CV dosyası bulunamazsa:
- Dosya yolunun doğru olduğundan emin olun
- Dosyanın proje kök dizinine göre yolunu kullanın
- Dosya uzantısının doğru olduğundan emin olun
