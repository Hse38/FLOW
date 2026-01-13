# Firebase Senkronizasyon Scriptleri

## ⚠️ ÖNEMLİ: Veri Kaybını Önlemek İçin

Canlıda (Firebase'de) yaptığınız değişikliklerin kaybolmaması için aşağıdaki adımları takip edin:

## 🔄 Senaryo 1: Canlıda Değişiklik Yaptınız, org.json'a Aktarmak İstiyorsunuz

```bash
node scripts/sync-from-firebase.js
```

Bu script:
- Firebase'deki mevcut verileri çeker
- org.json'a yazar (yedek oluşturur)
- Böylece canlıdaki değişiklikler org.json'a aktarılır

## 📤 Senaryo 2: org.json'daki Değişiklikleri Firebase'e Yüklemek İstiyorsunuz

**ÖNCE:** Canlıda değişiklik yaptıysanız, önce sync-from-firebase.js çalıştırın!

```bash
# 1. Önce Firebase'den veri çek (canlıdaki değişiklikleri korumak için)
node scripts/sync-from-firebase.js

# 2. org.json'da gerekli değişiklikleri yap

# 3. Sonra Firebase'e yükle
node scripts/sync-to-firebase.js
```

## 🚨 DİKKAT

- `sync-to-firebase.js` Firebase'deki **TÜM** verileri siler ve org.json'daki verileri yazar
- Canlıda yaptığınız değişiklikler kaybolabilir!
- Her zaman önce `sync-from-firebase.js` çalıştırın

## 📝 Git Push Öncesi

Git push yapmadan önce:
1. Canlıda değişiklik yaptıysanız: `node scripts/sync-from-firebase.js`
2. org.json'ı kontrol edin
3. Git commit ve push yapın
4. Gerekirse: `node scripts/sync-to-firebase.js` (sadece org.json'daki yeni değişiklikleri yüklemek için)
