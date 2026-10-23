# Mimari

Kodun nasıl düzenlendiğini ve **neden** öyle olduğunu anlatır. İşletme adımları için
[RUNBOOK.md](RUNBOOK.md).

## Genel bakış

Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind v4.
Veritabanı Supabase Postgres, erişim Prisma 6 (`@prisma/adapter-pg`). Oturum NextAuth v4 ile
**JWT**, yalnızca Google. Rate limit Upstash Redis. Harita Mapbox GL. Deploy Vercel.

```
tarayıcı ──► proxy.ts ──► app/layout.tsx ──► sayfa (server component)
              │              │                  │
              │              │                  ├─► lib/queries/*   (okuma)
              │              │                  └─► <Client Component>
              │              │                          │ form action / fetch
              │              ├─ dil (lang çerezi)       ▼
              │              └─ onay (consent çerezi)   lib/*-actions.ts ─► Prisma ─► Postgres
              ├─ CSP + nonce                              │
              └─ oturum yoksa yönlendirme                 └─ authorizeAction ─► rate limit
```

## Katmanlar ve klasörler

| Yer                 | Sorumluluk                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `app/`              | Rotalar. Sayfalar yalnızca **orkestrasyon** yapar: veriyi `lib/queries`'ten alır, bileşene verir. |
| `components/`       | UI. `ui/` genel parçalar, `map/` harita, `trips/` seyahat planlayıcı.                             |
| `lib/queries/`      | **Okuma** sorguları (`city`, `profile`, `admin`). Sayfalar `prisma`'yı doğrudan çağırmaz.         |
| `lib/*-actions.ts`  | **Yazma**: `"use server"` action'ları. Hepsi `authorizeAction` ile başlar.                        |
| `lib/auth*.ts`      | NextAuth ayarı, adapter, koruma fonksiyonları (`requireActiveUser`, `requireAdmin`).              |
| `lib/legal/`        | Gizlilik politikası ve şartlar (tr/en) + işletmeciye ait bilgiler (`config.ts`).                  |
| `lib/translations/` | 6 dil sözlüğü (`tr, en, de, fr, es, it`); `lib/i18n.ts` birleştirir.                              |
| `prisma/`           | Şema, migration'lar, seed, şehir verisi.                                                          |
| `scripts/`          | Veri üretimi (şehir, harita sınırı, demiryolu) ve `scripts/ci/`.                                  |
| `proxy.ts`          | Her istekte CSP + nonce; oturumsuz ziyaretçiyi korumalı sayfalardan yönlendirme.                  |

**Kural:** yeni bir sayfa veri okuyorsa sorgu `lib/queries/`'e, yazıyorsa action `lib/*-actions.ts`'e gider.

## Kimlik ve yetki

- **Güvenlik sınırı sunucudadır.** `proxy.ts`'teki yönlendirme bir kolaylıktır, koruma değil:
  her action ve API route kendi yetkisini `requireActiveUser` / `requireAdmin` ile kontrol eder.
- Bu fonksiyonlar kullanıcıyı **her istekte veritabanından** okur. JWT'deki rol ve `banned`
  alanları en çok 5 dakika bayat olabilir (`TOKEN_REFRESH_INTERVAL_SECONDS`); bu yüzden onlara
  güvenilmez. Yasaklanan ya da yetkisi alınan kullanıcı bir sonraki istekte etkilenir.
- Google'dan yalnızca kimlik alanları saklanır: OAuth erişim/yenileme token'ı ve profil
  fotoğrafı **yazılmaz** (`lib/auth-adapter.ts`).
- Rol (`USER` / `ADMIN`) veritabanında; atama [RUNBOOK](RUNBOOK.md#admin-atamak)'ta.

## Yazma yolu: action'lar

```ts
export async function ornek(_prev: ActionResult | null, formData: FormData) {
  return toActionResult(async () => {
    const user = await authorizeAction("ornek", { limit: 10 }); // oturum + yasak + rate limit
    // doğrula (zod), yaz, revalidatePath
  });
}
```

- `authorizeAction` (`lib/action-guard.ts`): aktif kullanıcı mı, rate limit anahtarı
  `${anahtar}:${user.id}` (IP değil, kullanıcıya göre).
- `toActionResult` (`lib/action-result.ts`): `UserFacingError` mesajı kullanıcıya gider;
  **diğer her hata** genel bir mesaja çevrilir ve loglanır. Prisma/altyapı hatalarının
  metni arayüze sızmaz.
- Girdi doğrulama `lib/schemas.ts` ve `lib/trip-schemas.ts` (zod).

## Veri

- Okuma sorguları sınırlıdır: sayfalama (`lib/pagination.ts`), yorum başına üst sınır,
  sitemap'te üst sınır. Sınırsız `findMany` eklenmez.
- Veri bütünlüğü yalnızca uygulamada değil, **veritabanında** da korunur: puan aralıkları,
  tarih sırası, kendini takip/engelleme yasağı, koordinat ve kullanıcı adı biçimi `CHECK`
  kısıtlarıyla (`20261022180000_…`). Prisma `CHECK`'leri
  şemada göstermez; onlar yalnızca migration dosyalarında yaşar.
- Kullanıcı silinince içeriği de gider (foreign key `ON DELETE CASCADE`); silme kodunda tablo
  listesi tutulmaz, böylece yeni tablo eklenince unutulmaz (`lib/account-deletion.ts`).
- Sitede **fotoğraf yüklenmez.** Avatar, hazır bir setten seçilen bir anahtardır
  (`User.avatar`, `lib/avatars.ts`); varsayılanı kullanıcı kimliğinden türetilir. Şehir
  fotoğrafı Unsplash'ten çekilip `City.imageUrl`'e önbelleğe alınır (`lib/city-photo.ts`).

## Güvenlik

- **CSP** her istekte `proxy.ts`'te, nonce ile üretilir (`lib/security-headers.ts`). Bu yüzden
  sayfalar dinamik render edilir: statik sayfa, build'de üretilmiş bir nonce taşırdı ve hiçbir
  yanıt başlığı onunla eşleşmezdi.
- `events.mapbox.com` CSP'ye yalnızca kullanıcı isteğe bağlı istatistiğe **izin verdiyse** eklenir.
- Rate limit Upstash'te; ortam değişkeni yoksa instance başına bellek içine düşer.
- Loglar PII içermez (bkz. [Gözlemlenebilirlik](#gözlemlenebilirlik)).

## Dil ve çerezler

- **Dil** sunucuda çözülür (`lib/lang.ts`): `lang` çerezi → tarayıcının `Accept-Language`'ı →
  İngilizce. `app/layout.tsx` `<html lang>`'i ve istemci bileşenlerinin ilk metnini buna göre
  basar (`components/LangProvider.tsx`); dil seçilince çerez yazılır ve sayfa sunucuda yeniden
  render edilir. Çerez yalnızca kullanıcı dil seçince yazılır.
- **Çerez onayı** (`consent=granted|denied`, 6 ay): yalnızca isteğe bağlı istatistik (Vercel
  Analytics, Mapbox kullanım olayları) içindir. Sunucu çerezi okur; reddedilince script sayfaya
  **hiç konmaz**, "konup kapatılmaz". Zorunlu çerezler (oturum, CSRF) onay gerektirmez.
- **Yasal sayfalar** işletmeci bilgileri girilene kadar production'da kapalıdır
  (`legalPagesAvailable`); bağlı yerler (login notu, banner linki, sitemap) birlikte gizlenir.

## Gözlemlenebilirlik

Sunucu hataları `lib/logger.ts` ile tek satırlık JSON olarak Vercel loglarına yazılır;
yakalanmayan hatalar `instrumentation.ts` (`onRequestError`), kök layout çökmesi
`app/global-error.tsx`. Başlık, çerez, gövde, sorgu parametresi, e-posta, token ve veritabanı
adresi **yazılmaz**; Prisma hata _mesajı_ hiç yazılmaz. İstemci hataları toplanmaz.

## Sayfa durumları ve 404

`generateMetadata` içinde `notFound()` çağrılır; bu, gerçek bir **404 durum kodunu** verebilmenin
son noktasıdır. **404 verebilen rotalara (`/c/[slug]`, `/u/[username]`, `/trips/[id]`)
`loading.tsx` eklenmez:** eklenirse yanıt akmaya başladığı için durum kodu 200 olur (soft-404).
`/meydan` ve `/trips`'te `loading.tsx` vardır.

## Erişilebilirlik kalıpları

- Modallar yerel `<dialog>` + `showModal()` ile (`hooks/useModalDialog.ts`): odak tuzağı, inert
  arka plan, odağın tetikleyiciye dönmesi hazırdır; kendi tuzağını yazma.
- Skip link ve `<main id="main-content">` `app/layout.tsx`'te. Harita, etiketli bir bölge ve
  şehir aramasına giden, odakta görünen bir kısayol taşır.
- Koyu zemin her iki temada da aynı uydu görselidir; doğrudan onun üstüne çizilen metin
  `text-on-backdrop*` token'larını kullanır. (Axe bu metinlerde açık temada "kontrast"
  bildirir; zemin `fixed -z-10` bir görsel olduğu için yanlış pozitiftir.)

## Test ve CI

- Vitest (`npm test`), ortam `node`; bileşenler `renderToStaticMarkup` ile sınanır. Testler
  hızlı birim testleridir ve Prisma'yı mock'lar; gerçek veritabanı davranışı `database` CI
  job'unda Postgres 17'ye karşı doğrulanır (migration'lar boş veritabanına uygulanır, şema
  drift'i ve seed denetlenir). Tarayıcıda uçtan uca (Playwright) test henüz yoktur.
- CI: `lint`, `test`, `build` (gizlisiz, sahte ortamla), `database`, `audit`. Ayrıntı README'de.

## Çalışma kuralları

- Her PR `main`'e hedeflenir. **PR'ları birbirinin üstüne yığma:** ara dallara merge edilen iş
  `main`'e hiç ulaşmayabilir.
- Şema değişikliği ve onu kullanan kod ayrı PR'dır (expand/contract); sıra
  [RUNBOOK](RUNBOOK.md#veritabanı-migrationı)'ta.
- Görsel kimlik (palet, tipografi, yerleşim) korunur; token'lar `app/globals.css`'te, kontrast
  oranları orada gerekçelendirilmiştir.
