<div align="center">

# 🌍 ErasmusMap

**Erasmus öğrencileri için Avrupa şehirlerini keşfetme ve değerlendirme platformu.**

[erasmusmap.vercel.app](https://erasmusmap.vercel.app)

[![CI](https://github.com/Gurcank/project-erasmus/actions/workflows/ci.yml/badge.svg)](https://github.com/Gurcank/project-erasmus/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](#lisans)

</div>

---

## Özellikler

- 🗺️ Uydu görüntülü interaktif Avrupa haritası — şehir sınırları, hover'da yükselme
- ⭐ Şehir değerlendirme sistemi — 6 kategori: Kültür, Gastronomi, Güvenlik, Sosyal Hayat, Ulaşım, Yaşam Maliyeti
- 👤 Kullanıcı profili, ziyaret edilen şehirler ve gitmek istenenler
- 🔐 Google ile giriş — şifre saklanmaz
- 🌐 Türkçe / İngilizce dil desteği
- 🌙 Koyu / Açık tema

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
| Test       | Vitest                  |
| Deploy     | Vercel                  |
| Fotoğraf   | Unsplash API            |
| Şehir veri | GeoNames (CC BY 4.0)    |
| Sınırlar   | Eurostat NUTS 3 + GADM  |

## Başlarken

### Gereksinimler

- Node.js 24 LTS (bkz. [`.nvmrc`](.nvmrc))
- PostgreSQL veritabanı (Supabase önerilir)

### Kurulum

```bash
git clone https://github.com/Gurcank/project-erasmus.git
cd project-erasmus
npm install
```

`.env.local` dosyası oluştur — tüm değişkenler ve açıklamaları için [`.env.example`](.env.example)'a bak:

| Değişken                    | Açıklama                                             | Zorunlu |
| --------------------------- | ---------------------------------------------------- | :-----: |
| `DATABASE_URL`              | PostgreSQL bağlantı adresi                           |   ✅    |
| `DIRECT_URL`                | Migration/seed için session bağlantısı (port `5432`) |   ✅    |
| `NEXTAUTH_SECRET`           | Oturum imzalama anahtarı — `openssl rand -base64 32` |   ✅    |
| `NEXTAUTH_URL`              | Canonical adres (local'de `http://localhost:3000`)   |   ✅    |
| `GOOGLE_CLIENT_ID`          | Google OAuth istemci ID'si                           |   ✅    |
| `GOOGLE_CLIENT_SECRET`      | Google OAuth istemci sırrı                           |   ✅    |
| `NEXT_PUBLIC_MAPBOX_TOKEN`  | Mapbox GL erişim anahtarı (tarayıcıya açık)          |   ✅    |
| `UNSPLASH_ACCESS_KEY`       | Şehir fotoğrafları için Unsplash API anahtarı        |   ✅    |
| `NEXT_PUBLIC_SITE_URL`      | Metadata/OG/sitemap için canonical adres             |    —    |
| `SUPABASE_URL`              | Supabase proje adresi (profil fotoğrafı depolama)    |   ✅    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role anahtarı — tarayıcıya açılmaz  |   ✅    |
| `UPSTASH_REDIS_REST_URL`    | Upstash Redis REST adresi (rate limit)               |    —    |
| `UPSTASH_REDIS_REST_TOKEN`  | Upstash Redis REST token'ı                           |    —    |

> **Supabase kullanıyorsan:** uygulama sorguları için connection pooler'ın _transaction_ modunu
> (port `6543`, `?pgbouncer=true`) kullan. `DIRECT_URL` ise aynı adresin `5432` portu olmalı —
> Prisma migration'ları pooler üzerinden advisory lock alamadığı için takılır.

> **Profil fotoğrafları:** Supabase panelinde `avatars` adında **public** bir Storage bucket'ı oluştur.
> Yükleme service-role anahtarıyla sunucu tarafında yapılır; okuma herkese açıktır. Bucket yoksa
> fotoğraf yükleme `503` döner, uygulamanın geri kalanı etkilenmez.

> **Rate limit:** `UPSTASH_*` değişkenleri tanımlı değilse limitleyici instance başına çalışan
> bellek içi bir pencereye düşer — yerel geliştirme için yeterli, üretimde değil.

```bash
npm run db:migrate   # migration'ları uygula
npm run db:seed      # şehirleri ekle
npm run dev          # geliştirme sunucusu
```

### Şehir verisi

Şehir listesi [`prisma/data/cities.json`](prisma/data/cities.json) dosyasında tutulur:
Erasmus+ ülkelerinde nüfusu 50.000'i geçen şehirler ve tüm başkentler (1602 kayıt),
koordinatları ve yerel/çeviri adlarıyla birlikte. Kaynak
[GeoNames](https://www.geonames.org) `cities15000` veri setidir ve
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ile lisanslanmıştır.

Listeyi tazelemek için:

```bash
curl -O https://download.geonames.org/export/dump/cities15000.zip
unzip cities15000.zip
npx ts-node scripts/build-city-data.ts cities15000.txt
```

### Harita sınırları

Haritadaki bölge sınırları [`public/map/regions.geojson`](public/map/regions.geojson)
dosyasından gelir. Kaynak sınırlar [`data/boundaries/`](data/boundaries) altındadır
(Eurostat NUTS seviye 3 + Batı Balkanlar ve Kıbrıs için GADM) ve **servis edilmez**,
yalnızca üretim girdisidir.

NUTS 3, "şehir" için doğru idari seviyedir — Türkiye'de 81 il, Fransa'da département,
Almanya'da Kreis. Ama NUTS adları kullanılamaz ("München, Kreisfreie Stadt"), bu yüzden
her bölge içindeki en büyük GeoNames şehrine bağlanır ve o şehrin adını taşır. Bölge
adıyla aynı adı taşıyan bir şehir varsa o tercih edilir (Tekirdağ ili "Çorlu" değil
"Tekirdağ" olarak etiketlenir). İçinde hiç şehir olmayan bölgeler soluk çizilir ve
tıklanamaz.

Sınır dosyasını yeniden üretmek için:

```bash
npx ts-node scripts/build-map-regions.ts
```

> Prisma CLI ayarları [`prisma.config.ts`](prisma.config.ts) içinde; `.env.local` oradan
> yükleniyor, ayrıca bir `.env` dosyası tutmana gerek yok.

### Komutlar

| Komut                | Açıklama                          |
| -------------------- | --------------------------------- |
| `npm run dev`        | Geliştirme sunucusu               |
| `npm run build`      | Production build                  |
| `npm run start`      | Production build'i çalıştır       |
| `npm run lint`       | ESLint                            |
| `npm run format`     | Prettier ile formatla             |
| `npm run test`       | Vitest ile unit testleri çalıştır |
| `npm run typecheck`  | TypeScript tip kontrolü           |
| `npm run db:migrate` | Migration'ları uygula             |
| `npm run db:seed`    | Şehirleri ekle                    |

## CI/CD

[`ci.yml`](.github/workflows/ci.yml) her push ve pull request'te lint, tip kontrolü, format, test,
build ve bağımlılık audit'i çalıştırır. Build job'ının geçmesi için yukarıdaki ortam değişkenlerinin repo'nun
**Settings → Secrets and variables → Actions** bölümünde tanımlı olması gerekir.

## Deployment

Uygulama [Vercel](https://vercel.com)'e deploy ediliyor. Vercel proje ayarlarında yukarıdaki ortam
değişkenlerinin tanımlı olduğundan emin ol; migration'lar deploy sürecinde `npx prisma migrate deploy`
ile veritabanına uygulanmalı.

## Hata takibi ve loglar

Sunucuda yakalanan her hata Vercel loglarına **tek satırlık JSON** olarak yazılır
([`lib/logger.ts`](lib/logger.ts)). Vercel → proje → **Logs** ekranında `"level":"error"`
ile arayabilir, `route`, `routeType` (`render` / `route` / `action`) ve `code`
alanlarına göre daraltabilirsin. Kullanıcıya gösterilen hata sayfasındaki
`digest` kodu, log satırındaki `error.digest` ile aynıdır.

- Yakalanmayan sayfa / route / action hataları: [`instrumentation.ts`](instrumentation.ts) (`onRequestError`).
- Kök layout çökerse: [`app/global-error.tsx`](app/global-error.tsx).
- Veritabanı erişilemiyorsa `/api/health` `503` döner ve log'a düşer; bir izleme servisine buradan bağlanabilirsin.

**Loglara ne yazılmaz:** başlıklar, çerezler, istek gövdesi, sorgu parametreleri (`?q=...`),
e-posta adresleri, token'lar ve veritabanı adresleri. Prisma hatalarının _mesajı_ hiç yazılmaz
(gönderilen değerleri içerebilir); yalnızca tür, kod ve model adı yazılır.

**Bilinen sınır:** Next.js, yakalanmayan _render_ hatalarını kendi çıktısıyla da yazdırır ve
bunu uygulama kodundan kapatamayız. Bu çıktı Prisma hata mesajını içerir (ör. veritabanı
adresi). Sayfalardaki sorguların girdisi URL'den gelen kısa değerlerdir (şehir, kullanıcı adı).
**İstemci tarafı** hatalar (tarayıcıdaki) hiçbir yere gönderilmez; bu bilinçli bir kapsam
sınırıdır (bir izleme servisi yok).

## Lisans

MIT
