# T3 Vakfı Organizasyon Şeması

İnteraktif kurumsal organizasyon yapı haritası uygulaması.

## 🚀 Deployment (Vercel)

Bu proje Vercel'de otomatik olarak deploy edilir. `main` branch'e push yapıldığında otomatik deploy başlar.

### Deployment Özellikleri

- ✅ **Otomatik Build**: Next.js 15 ile otomatik build
- ✅ **Firebase Entegrasyonu**: Production'da otomatik Firebase kullanımı
- ✅ **Node Pozisyonları**: Firebase'de kaydedilen pozisyonlar korunur
- ✅ **Environment Detection**: Localhost'ta localStorage, production'da Firebase

## 📦 Kurulum

```bash
npm install
```

## 🛠️ Geliştirme

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🔥 Firebase Yapılandırması

Firebase config `lib/firebase.ts` dosyasında tanımlıdır. Production'da otomatik olarak kullanılır.

### Firebase Database Yapısı

- `orgData/{projectId}` - Organizasyon verileri
- `positions/{projectId}` - Node pozisyonları
- `connections/{projectId}` - Bağlantılar
- `settings/locked` - Kilit durumu
- `settings/activeProjectId` - Aktif proje ID

## 📝 Önemli Notlar

1. **Node Pozisyonları**: Tüm node pozisyonları Firebase'de saklanır ve production'da korunur.
2. **Başlıklar**: Tüm başlıklar büyük harfle gösterilir (pozisyonlar korunur).
3. **Data Sync**: Production'da Firebase'den, localhost'ta localStorage'dan veri yüklenir.

## 🎯 Özellikler

- İnteraktif organizasyon şeması
- Drag & drop ile node pozisyonlama
- Firebase ile gerçek zamanlı senkronizasyon
- Responsive tasarım
- Sunum modu
- Çoklu proje desteği

## 📄 Lisans

Private - T3 Vakfı
