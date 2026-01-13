# CV Dosyaları Yükleme Rehberi

## 📁 Klasör Yapısı

CV dosyalarınızı **`cv-files`** klasörüne koyun:

```
proje-kök-dizini/
└── cv-files/
    ├── Bahar Kılıç - Bahar Kılıç.pdf
    ├── SERKAN UZUN CV - SERKAN UZUN.pdf
    ├── Gizem Karabacak_CV - Teknofest İletişim.pdf
    └── ...
```

## 📋 Excel'deki CV Dosya İsimleri

Excel dosyanızdaki CV kolonunda bulunan dosya adları (toplam 179 adet):

1. Bahar Kılıç - Bahar Kılıç.pdf
2. MK_CV_TR - Merve KOCOĞLU.docx
3. BC_CV - Büşra Coşkun.docx
4. CV sinan tüfekçi #1 (1) - SİNAN TÜFEKÇİ.pdf
5. SERKAN UZUN CV - SERKAN UZUN.pdf
... ve 174 tane daha

## ✅ Yapmanız Gerekenler

1. **CV dosyalarınızı bulun** (bilgisayarınızda nerede olduklarını kontrol edin)

2. **Tüm CV dosyalarını `cv-files` klasörüne kopyalayın**
   - Dosya adlarını değiştirmenize gerek yok
   - Script dosya adlarını otomatik olarak eşleştirecek

3. **Eksik dosyaları kontrol edin**
   - Eğer bazı CV dosyaları yoksa, script bunları atlar ve devam eder

4. **Script'i çalıştırın:**
   ```bash
   node scripts/update-personnel-info.js PERS.xlsx
   ```

## 🔍 Dosya Eşleştirme Mantığı

Script şu şekilde çalışır:
- Excel'deki CV yolu: "Bahar Kılıç - Bahar Kılıç.pdf"
- Script `cv-files` klasöründe bu dosyayı arar
- Dosya adı tam eşleşmezse, normalize edilmiş isimlerle eşleştirme yapar
- Örneğin: "bahar kılıç" ve "baharkılıç" eşleşir

## 💡 İpuçları

- Dosya adlarında Türkçe karakterler (ı, ş, ö, ü, ç, ğ) sorun değil
- Büyük/küçük harf duyarlı değil
- Boşluklar ve özel karakterler normalize edilir
- Eğer dosya bulunamazsa, script uyarı verir ve bir sonraki personele geçer

## 📊 İstatistikler

- **Toplam CV yolu:** 179
- **Benzersiz yol:** 178
- **Desteklenen formatlar:** .pdf, .docx, .doc, .png
