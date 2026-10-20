# ErasmusMap — Yol Haritası

**Güncelleme:** 17 Ekim 2026
**Canlı adres:** https://erasmusmap.vercel.app

> Bu belgenin önceki sürümü, proje kodu görülmeden yazılmış bir teşhis planıydı
> (`/sehir/[slug]` rotası, Prisma `Decimal` hipotezleri vb.). Kod okunduktan sonra
> bu varsayımların çoğu geçersiz çıktı; belge gerçek yapıya göre yeniden yazıldı.

## Gerçek yapı

| Konu            | Durum                                                               |
| --------------- | ------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4          |
| Şehir sayfası   | `/c/[slug]`                                                         |
| Auth            | NextAuth v4, JWT oturum, yalnızca Google                            |
| Veritabanı      | Supabase Postgres, Prisma 6 (havuzlu `DATABASE_URL` + `DIRECT_URL`) |
| Harita          | `mapbox-gl` doğrudan; yapılandırma `components/map/map-config.ts`   |
| Puanlar         | `Int?`, 1–10 ölçeği (7 = 3,5 yıldız); `Decimal` kullanılmıyor       |
| Çeviriler       | `lib/translations/{tr,en,de,fr,es,it}.ts`, birleşim `lib/i18n.ts`   |
| Rate limit      | Upstash Redis; tanımsızsa örnek başına bellek içi (üretimde uyarır) |
| Şehir fotoğrafı | Unsplash, ilk ziyarette yanıt gönderildikten sonra `after()` ile    |

## Yeni bir sayfa eklerken kalıp

1. `app/<rota>/page.tsx` — server component, veri çekme `lib/` içinde.
2. Mutasyonlar `lib/*-actions.ts` içinde (`"use server"`), her biri `requireActiveUser`
   ile yetkiyi sunucuda tekrar kontrol eder ve `rateLimit` uygular. Sayfa dosyasına
   satır içi action yazılmaz.
3. UI `components/ui/` içinde; metinler `lib/translations/*.ts` içinde **altı dilde**.
4. Navbar'a bağlantı, herkese açıksa `app/sitemap.ts` girişi, giriş gerektiriyorsa
   `proxy.ts` içindeki `SIGNED_IN_ONLY` listesi.

## Tamamlananlar (Ekim 2026)

- Şehir sayfasında yorumlar sayfalandı (`?reviews=N`, sayfa başına 10).
- Unsplash çağrısı render dışına alındı.
- Yorum gönderme action'ı `lib/city-actions.ts` içine taşındı.
- Kullanılmayan `Review.isApproved` kolonu kaldırıldı (migration eklendi).
- `Map.tsx` ve `i18n.ts` bölündü.
- Üretimde Upstash veya `NEXTAUTH_SECRET` eksikse uyarı loglanıyor.

## Açık işler

- `app/account/page.tsx` içindeki iki satır içi action `lib/profile-actions.ts` içine taşınmalı.
- Yorum başına yanıtlar hâlâ sınırsız çekiliyor; çok yanıtlı yorumlarda sınır gerekebilir.
- Unsplash'ten fotoğraf bulunamayan şehirler her ziyarette yeniden deneniyor.
- Moderasyon yalnızca kelime filtresi; bildirme (report) akışı yok.

## Doğrulama

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Sonra elle: çıkış yapmış halde ana sayfa → şehir → "daha fazla yorum"; Google ile giriş →
profil → çıkış; bir şehre yorum yaz → yenile; 375 px genişlikte tekrar.
