# 🌍 ErasmusMap

Erasmus öğrencileri için Avrupa şehirlerini keşfetme ve değerlendirme platformu.

**🔗 [project-erasmus.vercel.app](https://project-erasmus.vercel.app)**

[![CI](https://github.com/Gurcank/project-erasmus/actions/workflows/ci.yml/badge.svg)](https://github.com/Gurcank/project-erasmus/actions/workflows/ci.yml)

---

## Özellikler

- 🗺️ İnteraktif Avrupa haritası (Mapbox GL)
- ⭐ Şehir değerlendirme sistemi (6 kategori: Kültür, Gastronomi, Güvenlik, Sosyal Hayat, Ulaşım, Yaşam Maliyeti)
- 👤 Kullanıcı profili ve ziyaret edilen şehirler listesi
- 🔐 Google ve e-posta/şifre ile giriş
- 🌐 Türkçe / İngilizce dil desteği
- 🌙 Koyu / Açık tema

---

## Teknolojiler

| Katman     | Teknoloji               |
| ---------- | ----------------------- |
| Framework  | Next.js 16 (App Router) |
| Dil        | TypeScript              |
| Stil       | Tailwind CSS v4         |
| Harita     | Mapbox GL               |
| Auth       | NextAuth.js v4          |
| ORM        | Prisma                  |
| Veritabanı | PostgreSQL (Supabase)   |
| Deploy     | Vercel                  |
| Fotoğraf   | Unsplash API            |

---

## Kurulum

### Gereksinimler

- Node.js 20.9+ (bkz. `.nvmrc`)
- PostgreSQL veritabanı (Supabase önerilir)

### Adımlar

```bash
# Repoyu klonla
git clone https://github.com/Gurcank/project-erasmus.git
cd project-erasmus

# Bağımlılıkları yükle
npm install
```

`.env.local` dosyası oluştur (tüm değişkenler ve açıklamaları için `.env.example`'a bak):

| Değişken                   | Açıklama                                                        | Zorunlu                                 |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| `DATABASE_URL`             | PostgreSQL bağlantı adresi                                      | Evet                                    |
| `NEXTAUTH_SECRET`          | NextAuth oturum imzalama anahtarı (`openssl rand -base64 32`)   | Evet                                    |
| `NEXTAUTH_URL`             | Uygulamanın canonical adresi (local'de `http://localhost:3000`) | Evet                                    |
| `GOOGLE_CLIENT_ID`         | Google OAuth istemci ID'si                                      | Evet                                    |
| `GOOGLE_CLIENT_SECRET`     | Google OAuth istemci sırrı                                      | Evet                                    |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Tarayıcıya açık Mapbox GL erişim anahtarı                       | Evet                                    |
| `UNSPLASH_ACCESS_KEY`      | Şehir fotoğrafları için Unsplash API anahtarı                   | Evet                                    |
| `NEXT_PUBLIC_SITE_URL`     | Metadata/OG/sitemap için canonical site adresi                  | Hayır (yoksa production adresine düşer) |

```bash
# Veritabanı migration
npx prisma migrate deploy

# Şehirleri ekle
npx prisma db seed

# Geliştirme sunucusunu başlat
npm run dev
```

---

## Komutlar

| Komut                  | Açıklama                              |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Geliştirme sunucusu                   |
| `npm run build`        | Production build                      |
| `npm run start`        | Production build'i çalıştır           |
| `npm run lint`         | ESLint                                |
| `npm run format`       | Prettier ile formatla                 |
| `npm run format:check` | Formatlamayı değiştirmeden kontrol et |
| `npm run test`         | Vitest ile unit testleri çalıştır     |

---

## CI/CD

`.github/workflows/ci.yml`, `main`'e push ve pull request'lerde lint, test, build ve
bağımlılık audit adımlarını çalıştırır. Build adımının çalışması için repo
ayarlarında (Settings → Secrets and variables → Actions) yukarıdaki ortam
değişkenlerinin GitHub Actions secret'ı olarak tanımlı olması gerekir.

---

## Deployment

Uygulama Vercel'e deploy ediliyor. Vercel proje ayarlarında yukarıdaki ortam
değişkenlerinin tanımlı olduğundan emin ol; `npx prisma migrate deploy`
migration'ları veritabanına uygulamak için deploy öncesi/sonrası çalıştırılmalı.

---

## Lisans

MIT
