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

- 🗺️ İnteraktif Avrupa haritası (Mapbox GL)
- ⭐ Şehir değerlendirme sistemi — 6 kategori: Kültür, Gastronomi, Güvenlik, Sosyal Hayat, Ulaşım, Yaşam Maliyeti
- 👤 Kullanıcı profili ve ziyaret edilen şehirler listesi
- 🔐 Google ve e-posta/şifre ile giriş
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

## Başlarken

### Gereksinimler

- Node.js 20.9+ (bkz. [`.nvmrc`](.nvmrc))
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

## Lisans

MIT
