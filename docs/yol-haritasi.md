# ErasmusMap — Geliştirme Yol Haritası

**Sürüm:** 1.0
**Tarih:** 23 Ağustos 2026
**Canlı adres:** https://erasmusmap.vercel.app
**Durum:** Canlıda, 3 bilinen kritik hata var

---

## 0. Bu belge nasıl kullanılır

Bu belge bir _görev listesi_ değil, bir _teşhis + onarım protokolü_. Sıralama önemli:

1. **G0'ı atlama.** Şu an elimizde hatanın kendisi değil, hatanın kılıfı var. Production (canlı ortam) build'i gerçek hata mesajını gizliyor. Önce mesajı görünür hale getir, sonra tamir et.
2. Her görevin altında **"Olası neden"** listesi var. Bunlar hipotez, kesin teşhis değil. Her birinin yanında bir **kanıt düzeyi** yazıyor.
3. Her görevin sonunda **kabul kriteri** (ne olursa "bitti" sayılır) var. Kriteri karşılamadan bir sonrakine geçme.

Kanıt düzeyi etiketleri:

| Etiket             | Anlamı                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| 🟢 **Belgelenmiş** | Resmî dokümantasyonda veya proje deposunda doğrudan yazıyor                                     |
| 🟡 **Yaygın**      | Çok sayıda bağımsız kaynakta aynı belirtiyle raporlanmış, ama senin kodunda olduğu doğrulanmadı |
| 🔴 **Tahmin**      | Belirtiye göre mantıklı ama hiçbir kaynakla doğrulanmadı, önce kontrol edilmeli                 |

---

## 1. Bu analizin dayandığı bilgiler — ve eksikler

### Elimde olanlar

- Canlı sitenin HTML çıktısı (sadece kabuk geliyor; içerik tarayıcıda üretiliyor)
- Yığın bilgisi: Next.js (React), Mapbox, Prisma ORM (veritabanı erişim katmanı), Vercel'de barındırma
- Senin bildirdiğin 3 belirti

### Elimde OLMAYANLAR — bu belgenin kesinliğini sınırlıyor

- ❌ **Proje zip dosyası ulaşmadı.** Yükleme klasörü boş geldi.
- ❌ `package.json` — Next.js sürümü, Mapbox kütüphanesi (`mapbox-gl` mi `react-map-gl` mi), kimlik doğrulama kütüphanesi (NextAuth v4 mü Auth.js v5 mi) bilinmiyor
- ❌ `prisma/schema.prisma` — veri modeli, alan tipleri
- ❌ Şehir sayfasının kaynak kodu
- ❌ Vercel Function Logs (canlı sunucu kayıtları) — gerçek hata mesajı burada
- ❌ Veritabanı sağlayıcısı (Supabase / Neon / Vercel Postgres / PlanetScale?)

> **Yapılacak ilk iş:** Zip'i tekrar yükle. Yüklendikten sonra bu belgenin 1., 5. ve 6. bölümleri **kesin teşhisle** güncellenecek. Şu anki hali "en olası nedenler" listesi — kod görülünce çoğu eleniyor.

---

## 2. Öncelik sırası

| #   | Görev                                                               | Öncelik | Etki                           | Tahmini efor |
| --- | ------------------------------------------------------------------- | ------- | ------------------------------ | ------------ |
| G0  | Teşhis altyapısı — gerçek hataları görünür kılmak                   | 🔴 P0   | Diğer her şeyin ön koşulu      | 30 dk        |
| G1  | Şehir sayfası "Bir şeyler ters gitti" hatası                        | 🔴 P0   | Ana özellik tamamen çalışmıyor | 1–3 sa       |
| G2  | Google ile giriş başa atıyor                                        | 🔴 P0   | Kullanıcı hesabı açılamıyor    | 1–3 sa       |
| G3  | Harita işaretçileri: her zaman 2D, hover'da 3D                      | 🟠 P1   | Görsel/UX                      | 2–4 sa       |
| G4  | Genel denetim (güvenlik, erişilebilirlik, performans, boş durumlar) | 🟡 P2   | Kalite tabanı                  | 1–2 gün      |

**Kural:** G1 ve G2 bitmeden G3'e geçme. Kırık bir sitenin işaretçilerini güzelleştirmenin değeri yok.

---

## G0 — Teşhis altyapısı

Şu anda gördüğün mesaj bir hata değil, bir **perde**:

> "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included..."

Bu Next.js'in kasıtlı davranışı: canlıda gerçek hata metnini kullanıcıya göstermez, yerine bir **digest** (hatanın kısa parmak izi) koyar. Gerçek metin sunucu kayıtlarında duruyor.

### G0.1 — Vercel loglarından gerçek hatayı çek

```bash
# Terminalden, projenin kök klasöründe:
npx vercel logs erasmusmap.vercel.app --follow
```

Ya da tarayıcıdan: **Vercel Dashboard → Proje → Observability → Logs** (bazı planlarda _Functions → Logs_).

Sonra:

1. Kayıtlar akarken siteye gir, bir şehre tıkla.
2. Log'da beliren hata satırını **tamamen** kopyala (stack trace / hata yığını dahil).
3. Tarayıcı konsolundaki `digest: "..."` değerini not al — log'daki kayıtla eşleştirmeni sağlar.

### G0.2 — Yereli production moduna al

Geliştirme modunda (`npm run dev`) hata görünmeyebilir, çünkü davranışlar farklı. Canlıya en yakın ortam:

```bash
npm run build
npm run start
```

Bu komut hem derleme (build) hatalarını hem çalışma zamanı hatalarını yerelde, **tam mesajıyla** gösterir.

### G0.3 — Ortam değişkenlerini yerele çek

```bash
npx vercel env pull .env.local
```

Böylece yerelde canlıyla aynı veritabanına ve aynı ayarlara bağlanırsın. Hata canlıda çıkıp yerelde çıkmıyorsa neden %90 ihtimalle ortam değişkenlerindedir.

> ⚠️ `.env.local` dosyasının `.gitignore` içinde olduğunu doğrula. Bu dosyada veritabanı şifresi ve OAuth gizli anahtarı var.

### ✅ Kabul kriteri

- [ ] Şehir sayfası hatasının **tam metni** elimde (digest değil)
- [ ] `npm run build && npm run start` ile yerelde aynı hata tekrar üretilebiliyor
- [ ] `.env.local` çekildi ve git'e girmediği doğrulandı

---

## G1 — Şehir sayfası: "Bir şeyler ters gitti"

**Belirti:** Herhangi bir şehre tıklayınca Server Components render hatası.

Bu bir _çökme_, _bulunamadı_ değil. Yani sayfa render edilmeye başlıyor ve ortasında bir istisna (exception) fırlıyor. Sık görülen 5 neden, olasılık sırasıyla:

### Hipotez A — Prisma `Decimal` / `Date` client bileşenine geçiyor 🟡 Yaygın

Bu senin projene **çok** uyuyor: şehir sayfasında ortalama puanlar var, puan ortalaması genelde `Decimal` (ondalık) tipinde saklanır ve yorumlarda `createdAt` (tarih) alanı olur.

Next.js, sunucu bileşeninden istemci bileşenine (`"use client"` yazan dosyaya) prop geçerken veriyi JSON'a çevirir. Prisma'nın `Decimal` nesnesi düz bir JSON değeri değil — sınırı geçemez ve hata fırlatır.

Hata metni şuna benzer:
`Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`

**Kaynak:** prisma/prisma Issue #25960 — https://github.com/prisma/prisma/issues/25960 · Prisma Discussion #19983 — https://github.com/prisma/prisma/discussions/19983

**Çözüm — dağınık değil, tek yerde:**

Her sayfada tek tek dönüştürmek yerine, veri katmanında bir serileştirici (nesneyi düz JSON'a çeviren fonksiyon) kullan:

```ts
// lib/serialize.ts
import { Prisma } from "@prisma/client";

type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

export function serialize<T>(value: T): Serialized<T> {
  if (value instanceof Prisma.Decimal) return value.toNumber() as Serialized<T>;
  if (value instanceof Date) return value.toISOString() as Serialized<T>;
  if (Array.isArray(value)) return value.map(serialize) as Serialized<T>;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serialize(v)]),
    ) as Serialized<T>;
  }
  return value as Serialized<T>;
}
```

Sonra şehir verisini çeken fonksiyonun dönüşünde bir kez uygula:

```ts
// lib/cities.ts
export async function getCityBySlug(slug: string) {
  const city = await prisma.city.findUnique({
    where: { slug },
    include: { reviews: { include: { author: true } } },
  });
  return city ? serialize(city) : null;
}
```

> **Not:** `Date` artık string olarak gelecek. Tarih biçimlendiren yardımcı fonksiyonların `Date | string` ikisini de kabul etmeli.

### Hipotez B — `params` await edilmiyor (Next.js 15+) 🟢 Belgelenmiş

Next.js 15 ile birlikte `params`, `searchParams`, `cookies()`, `headers()` **artık senkron değil, Promise döndürüyor.** Next.js 15 bir süre eski kullanımı tolere etti; Next.js 16 ve `cacheComponents` açıkken hata veriyor.

**Kaynak:** Next.js Upgrading v15 — https://nextjs.org/docs/app/guides/upgrading/version-15 · Sync Dynamic APIs — https://nextjs.org/docs/messages/sync-dynamic-apis

```ts
// ❌ Eski (Next 14 tarzı)
export default function CityPage({ params }: { params: { slug: string } }) {
  const city = params.slug;
}

// ✅ Doğru
export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
}
```

**Otomatik düzeltme (codemod — kodu toplu dönüştüren araç):**

```bash
npx @next/codemod@latest next-async-request-api .
```

Çalıştırdıktan sonra kodda `@next-codemod-error` yorumlarını ara — bunlar aracın çeviremediği, elle bakman gereken yerler.

### Hipotez C — Prisma client Vercel'de üretilmiyor 🟡 Yaygın

Vercel `node_modules` klasörünü önbelleğe alır. Bu, Prisma'nın otomatik üretim adımının atlanmasına ve eski/eksik bir client ile deploy edilmesine yol açar.

**Kaynak:** Prisma Deploy to Vercel — https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel

```jsonc
// package.json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build",
  },
}
```

### Hipotez D — Veritabanı bağlantı havuzu 🟡 Yaygın

Vercel'de her istek ayrı bir sunucusuz fonksiyon (serverless function) olarak çalışabilir. Her biri kendi veritabanı bağlantısını açarsa havuz hızla tükenir → `P2024: Timed out fetching a new connection from the connection pool`.

**Kaynak:** Prisma Deploy to Vercel (yukarıdaki link) · Vercel Community — https://community.vercel.com/t/connection-pool-timeout-with-prisma-and-vercel-postgres/475

İki şey birlikte gerekli:

**1. Singleton (tek örnek) deseni** — geliştirmede sıcak yeniden yükleme sırasında yeni client üretmeyi engeller:

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**2. Havuzlanmış bağlantı adresi** — sağlayıcına göre:

| Sağlayıcı       | Havuzlu adres                                                                   |
| --------------- | ------------------------------------------------------------------------------- |
| Supabase        | Port `6543` + `?pgbouncer=true&connection_limit=1`                              |
| Neon            | `-pooler` içeren host adı                                                       |
| Vercel Postgres | `POSTGRES_PRISMA_URL` (havuzlu) + `POSTGRES_URL_NON_POOLING` (`directUrl` için) |

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // havuzlu — uygulama bunu kullanır
  directUrl = env("DIRECT_DATABASE_URL") // havuzsuz — migration bunu kullanır
}
```

### Hipotez E — Şehir bulunamadığında `notFound()` çağrılmıyor 🔴 Tahmin

Veri gelmezse `city` `null` olur ve `city.name` erişimi `TypeError` fırlatır.

```ts
import { notFound } from "next/navigation";

const city = await getCityBySlug(slug);
if (!city) notFound();
```

Ve `app/sehir/[slug]/not-found.tsx` dosyasını ekle — kullanıcı ham hata yerine anlamlı bir sayfa görsün.

### G1 — Yapılacaklar

- [ ] G0'daki gerçek hata metnine göre yukarıdaki hipotezlerden hangisi olduğunu belirle
- [ ] `npx @next/codemod@latest next-async-request-api .` çalıştır
- [ ] `lib/serialize.ts` ekle, şehir verisi çeken tüm fonksiyonlara uygula
- [ ] `package.json` içine `postinstall: prisma generate` ekle
- [ ] `lib/prisma.ts` singleton deseninde mi kontrol et
- [ ] Veritabanı adresinin havuzlu olduğunu doğrula
- [ ] `notFound()` + `not-found.tsx` ekle
- [ ] `app/sehir/[slug]/error.tsx` ekle — çöküş halinde bile "Bir şeyler ters gitti" yerine yeniden dene butonu olan bir arayüz

### ✅ Kabul kriteri

- [ ] En az 5 farklı şehre tıklanıyor, hiçbirinde hata yok
- [ ] Var olmayan bir slug (`/sehir/asdasd`) tasarlanmış 404 sayfası gösteriyor, çökmüyor
- [ ] Vercel loglarında bu rotaya ait hata kaydı yok

---

## G2 — Google ile giriş başa atıyor

**Belirti:** Google hesap seçme ekranı açılıyor, hesap seçiliyor, sonra siteye dönüyor ama oturum açılmamış oluyor.

Bu belirti neredeyse her zaman şu anlama gelir: **callback (geri dönüş) adımı başarısız oluyor ve kütüphane sessizce ana sayfaya yönlendiriyor.** Google tarafı sorunsuz — sorun geri dönüşte.

### G2.0 — Önce gerçek hata kodunu yakala (bunu atlama)

Giriş denemesinden sonra adres çubuğuna bak. Genellikle `?error=XXX` gibi bir parametre olur:

| Hata kodu                        | Anlamı                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `OAuthCallback`                  | Google'dan gelen kodun işlenmesi başarısız — genelde gizli anahtar/adres uyuşmazlığı |
| `OAuthAccountNotLinked`          | Bu e-posta zaten başka yöntemle kayıtlı                                              |
| `Configuration`                  | Ortam değişkeni eksik veya hatalı                                                    |
| `AccessDenied`                   | `signIn` callback'i `false` döndürdü                                                 |
| `unauthenticated` / parametresiz | Oturum çerezi (cookie) yazılamadı                                                    |

Aynı anda **Vercel Function Logs**'a bak — `[auth][error]` ile başlayan satırlar gerçek sebebi yazar.

Ve **tarayıcı DevTools → Application → Cookies**'e bak: `__Secure-authjs.session-token` (v5) veya `__Secure-next-auth.session-token` (v4) çerezi oluşmuş mu?

### Neden 1 — Google Console'daki yönlendirme adresi 🟢 Belgelenmiş

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID:

**Authorized redirect URIs** listesinde **birebir** bu olmalı:

```
https://erasmusmap.vercel.app/api/auth/callback/google
```

Sık yapılan hatalar: sondaki `/`, `http` yerine `https` unutulması, `www.` eklenmesi, `/api/auth/callback` (sonundaki `/google` eksik), preview (önizleme) deploy adreslerinin eklenmemesi.

**Authorized JavaScript origins:**

```
https://erasmusmap.vercel.app
```

### Neden 2 — `NEXTAUTH_URL` / `AUTH_URL` eksik veya yanlış 🟡 Yaygın

Vercel'de bu değişken tanımlı değilse kütüphane dinamik `.vercel.app` deploy adresini kullanmaya çalışır ve Google'a kayıtlı adresle uyuşmaz.

**Kaynak:** next-auth Issue #6457 — https://github.com/nextauthjs/next-auth/issues/6457

Vercel → Settings → Environment Variables:

```
NEXTAUTH_URL = https://erasmusmap.vercel.app     # NextAuth v4 için
AUTH_URL     = https://erasmusmap.vercel.app     # Auth.js v5 için
```

> Değişken ekledikten sonra **yeniden deploy etmen şart.** Vercel ortam değişkenlerini build sırasında gömüyor; kaydetmek tek başına yetmiyor.

### Neden 3 — Gizli anahtar (secret) eksik 🟡 Yaygın

Bu değişken yoksa oturum belirteci (token) imzalanamaz. Yerelde geliştirme modunda tolere edilir, canlıda edilmez — bu yüzden "yerelde çalışıyor, canlıda çalışmıyor" tablosu oluşur.

```bash
openssl rand -base64 32
```

```
NEXTAUTH_SECRET = <çıkan değer>   # v4
AUTH_SECRET     = <çıkan değer>   # v5
```

### Neden 4 — Prisma adaptörü + veritabanı 🟡 Yaygın

Eğer `PrismaAdapter` kullanıyorsan, Google callback'i sırasında `User` ve `Account` kayıtları veritabanına yazılır. Veritabanı erişilemiyorsa **giriş sessizce başarısız olur** — çünkü hata callback içinde yakalanır.

**Yani G1'deki veritabanı sorunları G2'nin de nedeni olabilir.** İki hata tek kök nedene bağlı olabilir; bu ikisini birlikte test et.

Kontrol et:

- [ ] `User`, `Account`, `Session`, `VerificationToken` tabloları canlı veritabanında **gerçekten var mı?** (`npx prisma migrate deploy` çalıştırılmış mı?)
- [ ] Adaptör paketi doğru mu — v4 için `@next-auth/prisma-adapter`, v5 için `@auth/prisma-adapter`

### Neden 5 — Oturum stratejisi ile adaptör uyuşmazlığı 🟡 Yaygın

`session: { strategy: "database" }` kullanıyorsan adaptör **zorunlu**. `strategy: "jwt"` kullanıyorsan adaptör isteğe bağlı ama `Account` kaydı yine de yazılır. Karışık yapılandırma sessiz başarısızlığın klasik kaynağı.

### Neden 6 — `OAuthAccountNotLinked` 🟡 Yaygın

Aynı e-posta ile daha önce başka bir yöntemle (e-posta/şifre veya farklı sağlayıcı) kayıt olduysan, Google girişi güvenlik gereği reddedilir. Tarayıcı bunu genelde sadece ana sayfaya dönüş olarak gösterir.

**Test:** Veritabanında kendi e-postanla bir `User` kaydı var mı bak. Varsa ve `Account` tablosunda `provider = "google"` satırı yoksa neden bu.

**Çözüm:** Test kaydını sil ve tekrar dene. Kalıcı çözüm istiyorsan `allowDangerousEmailAccountLinking: true` var ama **adı boşuna öyle değil** — sadece e-postasını doğrulayan sağlayıcılarla (Google öyle) ve bilinçli olarak kullanılmalı.

### G2 — Yapılacaklar

- [ ] Giriş sonrası URL'deki `?error=` kodunu ve Vercel logundaki `[auth][error]` satırını kaydet
- [ ] Google Console'daki redirect URI'yi karakter karakter doğrula
- [ ] `NEXTAUTH_URL`/`AUTH_URL` ve `NEXTAUTH_SECRET`/`AUTH_SECRET` ekle → **yeniden deploy et**
- [ ] Auth tablolarının canlı veritabanında var olduğunu doğrula
- [ ] `strategy` ile adaptör kullanımının tutarlı olduğunu doğrula
- [ ] `error.tsx` yerine özel bir `/giris/hata` sayfası yap — kullanıcı neden giremediğini okuyabilsin

### ✅ Kabul kriteri

- [ ] Google ile giriş yapılıyor, profil sayfası açılıyor
- [ ] Sayfa yenilendiğinde oturum kayboluyor mu? Kaybolmuyor.
- [ ] Çıkış yapıldığında oturum gerçekten sonlanıyor
- [ ] Farklı bir tarayıcıda / gizli sekmede de çalışıyor
- [ ] Başarısız giriş durumunda kullanıcı bir açıklama görüyor, sessizce ana sayfaya atılmıyor

---

## G3 — Harita işaretçileri: her zaman 2D, hover'da 3D

**İstenen davranış:**

- Varsayılan: şehir işaretçileri **her zaman düz (2D)**, küre eğrisinden bağımsız, ekrana bakar
- Hover (üzerine gelince): işaretçi **3D** görünür

**Şu anki davranış:** Uzaklaşınca 3D (küreye yatık), yakınlaşınca 2D, hover'da 3D.

### G3.0 — Önce hangi teknikle çizildiğini belirle

Bu belirleyici. İki tamamen farklı yol var:

| Teknik                                                                 | Nasıl anlarsın                                                                                              | Hover'da 3D yapmak   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| **HTML Marker** (`new mapboxgl.Marker()` veya react-map-gl `<Marker>`) | Kodda `Marker` bileşeni/sınıfı geçiyor; DOM'da `.mapboxgl-marker` elemanları var                            | ✅ Kolay — CSS ile   |
| **Symbol layer** (`map.addLayer({ type: "symbol" })`)                  | Kodda `addLayer` ve `icon-image`/`text-field` geçiyor; DOM'da işaretçi elemanı **yok**, canvas'ın içindeler | ⚠️ Zor — aşağıya bak |

Hızlı test: canlı sitede DevTools → Elements → `.mapboxgl-marker` ara. Varsa HTML Marker.

---

### Yol A — HTML Marker kullanıyorsan (muhtemelen bu)

#### Neden şu an 3D görünüyor

Mapbox Marker'ın iki hizalama ayarı var:

- `rotationAlignment` — işaretçinin dönüşü haritaya mı ekrana mı göre
- `pitchAlignment` — işaretçinin harita eğimiyle yatıp yatmayacağı

Varsayılan ikisi de `'auto'`, yani `'viewport'` (ekrana göre, hep düz). Yani sen bunu **açıkça değiştirmişsin.**

En güçlü hipotez: `rotationAlignment: 'horizon'` kullanılmış. Bu ayar özellikle küre görünümü için eklendi ve Mapbox'ın kendi açıklamasına göre **harita küreden Mercator'a (düz haritaya) geçerken işaretçiler yumuşak bir şekilde `viewport` davranışına dönüşür.** Senin tarif ettiğin "uzakta 3D, yakınlaşınca 2D" tam olarak bu. 🟡 Yaygın → kodu görünce 🟢 olur

**Kaynak:** Mapbox GL JS PR #11894 — https://github.com/mapbox/mapbox-gl-js/pull/11894 · Örnek — https://docs.mapbox.com/mapbox-gl-js/example/marker-horizon-aligned/ · API — https://docs.mapbox.com/mapbox-gl-js/api/markers/

#### Adım 1 — Her zaman 2D yap

```ts
const marker = new mapboxgl.Marker({
  element: el,
  rotationAlignment: "viewport", // 'horizon' veya 'map' değil
  pitchAlignment: "viewport",
});
```

react-map-gl kullanıyorsan:

```tsx
<Marker
  longitude={city.lng}
  latitude={city.lat}
  rotationAlignment="viewport"
  pitchAlignment="viewport"
/>
```

> Bu iki prop **reaktif değil** — sadece bileşen ilk kez bağlandığında okunur. Sonradan state ile değiştirmek işe yaramaz.

#### Adım 2 — Hover'da 3D

⚠️ **Kritik detay:** Mapbox, işaretçinin **kök elemanının** `transform` özelliğini konumlandırma için sürekli yeniden yazar. Kök elemana kendi 3D dönüşümünü yazarsan Mapbox onu her karede ezer.

Çözüm: içeriği bir sarmalayıcıya koy, dönüşümü **içteki** elemana uygula.

```tsx
// components/CityMarker.tsx
"use client";

export function CityMarker({ city }: { city: City }) {
  return (
    // dış katman: Mapbox'ın konumlandırdığı kök
    <div className="group [perspective:600px]">
      {/* iç katman: 3D dönüşüm burada, Mapbox'a dokunmuyor */}
      <div
        className="
          origin-bottom transition-transform duration-200 ease-out
          [transform:rotateX(0deg)_scale(1)]
          group-hover:[transform:rotateX(45deg)_scale(1.2)]
          motion-reduce:transition-none
          motion-reduce:group-hover:[transform:scale(1.1)]
        "
      >
        {/* işaretçi içeriği */}
      </div>
    </div>
  );
}
```

Notlar:

- `perspective` **ebeveynde** olmalı, yoksa `rotateX` düz bir sıkışma gibi görünür, derinlik hissi olmaz
- `origin-bottom` — işaretçi tabanından yatsın, ortasından değil (pin mantığı)
- `motion-reduce:` — hareket azaltma tercihini açmış kullanıcılar için (erişilebilirlik tabanı)

#### Adım 3 — Klavye ile de çalışsın

Hover sadece fareye çalışır. İşaretçi tıklanabilirse `<button>` olmalı ve `focus-visible` de aynı efekti almalı:

```
group-hover:[transform:...] group-focus-visible:[transform:...]
```

---

### Yol B — Symbol layer kullanıyorsan

`icon-pitch-alignment` ve `icon-rotation-alignment` **layout (yerleşim) özellikleri.** Layout özellikleri feature-state (tek tek öğeye bağlı durum) ile beslenemez — yani "sadece hover'daki işaretçiyi 3D yap" doğrudan mümkün değil. 🟡 Yaygın, kendi sürümünde doğrula

**Kaynak:** Mapbox GL JS Issue #4120 — https://github.com/mapbox/mapbox-gl-js/issues/4120

Üç seçenek:

1. **Tüm katmanı `viewport` yap, hover için ikinci bir katman ekle.** İkinci katmanda `icon-pitch-alignment: "map"` ve `filter: ["==", ["id"], hoveredId]`. Temiz ama iki katman bakımı gerektirir.
2. **Hibrit:** Şehirler symbol layer'da kalsın (performans), hover olan şehir için tek bir HTML Marker oluşturulup üstüne bindirilsin. En esnek çözüm.
3. **Tamamen HTML Marker'a geç.** En basit kod, ama **performans sınırı var**: birkaç yüz işaretçiden sonra harita gözle görülür şekilde yavaşlar. Avrupa'daki tüm Erasmus şehirleri birkaç yüz eder — bu sınırı ölçmeden geçme.

### G3 — Yapılacaklar

- [ ] İşaretçilerin HTML Marker mı symbol layer mı olduğunu belirle
- [ ] `rotationAlignment`/`pitchAlignment` değerlerini bul, `viewport` yap
- [ ] İç sarmalayıcı + `perspective` + `group-hover` yapısını kur
- [ ] `prefers-reduced-motion` desteğini ekle
- [ ] Klavye odağında da aynı efekt
- [ ] 200+ işaretçi ile kaydırma/yakınlaştırma akıcılığını ölç (DevTools → Performance)

### ✅ Kabul kriteri

- [ ] Her yakınlık seviyesinde (küre görünümü dahil) işaretçiler düz
- [ ] Haritayı döndürünce işaretçiler eğilmiyor
- [ ] Hover'da net bir 3D yatma efekti var, çıkınca düzgün geri dönüyor
- [ ] Tab tuşuyla gezilebiliyor, odaklanınca efekt görünüyor
- [ ] Hareket azaltma açıkken dönme yerine sade bir büyüme oluyor

---

## G4 — Genel denetim

Zip geldikten sonra bu bölüm somut bulgularla doldurulacak. Şimdilik hangi başlıklara bakılacağı:

### Güvenlik

- [ ] `.env*` dosyaları git geçmişinde var mı? (`git log --all --full-history -- .env*`)
- [ ] Mapbox token'ı `NEXT_PUBLIC_` ile başlıyorsa — bu normaldir (tarayıcının görmesi gerekir) ama Mapbox panelinden **URL kısıtlaması** eklenmiş olmalı, yoksa başkası senin kotanı harcar
- [ ] Her Server Action (sunucu eylemi) girdisini doğruluyor mu ve yetkiyi **sunucuda** tekrar kontrol ediyor mu? Butonu gizlemek güvenlik değil
- [ ] Yorum yazma / puanlama uç noktalarında hız sınırı (rate limit) var mı?
- [ ] Kullanıcı yorumları `dangerouslySetInnerHTML` ile mi basılıyor? Öyleyse XSS riski

### Veri bütünlüğü

- [ ] Bir kullanıcı aynı şehre iki kez puan verebiliyor mu? (`@@unique([userId, cityId])`)
- [ ] Puan aralığı veritabanı seviyesinde sınırlı mı, sadece arayüzde mi?
- [ ] Ortalama puan her istekte mi hesaplanıyor, yoksa önceden hesaplanıp saklanıyor mu? Şehir sayısı arttıkça bu fark eder

### Performans

- [ ] N+1 sorgu var mı — şehir listesi çekilirken her şehir için ayrı puan sorgusu atılıyor mu?
- [ ] Şehir listesi sayfalanıyor mu, hepsi birden mi geliyor?
- [ ] Görseller `next/image` ile mi? Şehir fotoğrafları yığın halinde ham `<img>` ise ilk yükleme çok yavaşlar
- [ ] Harita bileşeni `dynamic(() => ..., { ssr: false })` ile mi yükleniyor? Mapbox sunucuda çalışamaz

### Erişilebilirlik

- [ ] Puan yıldızları klavyeyle kullanılabiliyor mu, yoksa tıklanabilir `<div>` mi?
- [ ] Odak halkası (focus ring) görünür mü?
- [ ] Metin/arka plan kontrastı 4.5:1'i geçiyor mu?
- [ ] Harita üzerindeki bilgilere haritasız bir alternatif var mı? (şehir listesi sayfası)

### Durumlar

- [ ] Her async ekranın yükleniyor / hata / boş hali tasarlanmış mı?
- [ ] "Henüz değerlendirme yok" ekranında bir eylem butonu var mı, yoksa sadece gri yazı mı?
- [ ] Profilde hiç şehir yokken ne görünüyor?

### SEO / paylaşım

- [ ] Şehir sayfalarında `generateMetadata` ile şehir adı başlığa giriyor mu?
- [ ] Paylaşım görseli (`opengraph-image`) şehre özel mi, hep aynı mı?
- [ ] `sitemap.ts` ve `robots.ts` var mı?

---

## Doğrulama protokolü

Her düzeltmeden sonra, "çalışıyor gibi" demeden önce:

```bash
npx tsc --noEmit        # tip kontrolü
npm run lint            # kod kalitesi kontrolü
npm run build           # derleme — canlıda çıkacak hatalar burada çıkar
npm run start           # canlıya en yakın yerel çalıştırma
```

Sonra tarayıcıda elle:

1. Çıkış yapmış halde ana sayfa → şehir → geri
2. Google ile giriş → profil → çıkış
3. Bir şehre puan ver → sayfayı yenile → puan duruyor mu
4. 375px genişlikte (telefon) aynı akışı tekrarla
5. Tarayıcı konsolunda hiç kırmızı satır kalmadığını doğrula

Deploy sonrası: Vercel loglarını 10 dakika açık bırak, gerçek trafikte hata düşüyor mu bak.

---

## Kaynaklar

**Next.js**

- Sürüm 15'e yükseltme (async params) — https://nextjs.org/docs/app/guides/upgrading/version-15
- Dinamik API'ler artık asenkron — https://nextjs.org/docs/messages/sync-dynamic-apis
- Sürüm 16'ya yükseltme — https://nextjs.org/docs/app/guides/upgrading/version-16

**Prisma**

- Vercel'e deploy (bağlantı havuzu, `prisma generate`) — https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
- Decimal serileştirme sorunu — https://github.com/prisma/prisma/issues/25960
- Decimal + RSC tartışması — https://github.com/prisma/prisma/discussions/19983

**Auth**

- Vercel'de `NEXTAUTH_URL` sorunu — https://github.com/nextauthjs/next-auth/issues/6457
- Canlıda boş oturum — https://github.com/nextauthjs/next-auth/issues/3208
- Vercel topluluğu, Google OAuth yönlendirme — https://community.vercel.com/t/vercel-deployment-issue-with-google-oauth/12993

**Mapbox**

- Marker API (`rotationAlignment`, `pitchAlignment`) — https://docs.mapbox.com/mapbox-gl-js/api/markers/
- `rotationAlignment: 'horizon'` PR'ı — https://github.com/mapbox/mapbox-gl-js/pull/11894
- Ufka hizalı işaretçi örneği — https://docs.mapbox.com/mapbox-gl-js/example/marker-horizon-aligned/
- Hizalama özelliklerinin tam listesi — https://github.com/mapbox/mapbox-gl-js/issues/4120

---

## Açık sorular

Zip geldiğinde kodda cevaplanacak, ama sen daha hızlı cevaplayabilirsin:

1. **Next.js sürümü kaç?** (`package.json` → `"next"`) — 15+ ise async params neredeyse kesin bir etken
2. **Auth kütüphanesi hangisi?** NextAuth v4 mü, Auth.js v5 mi? Değişken adları ve paket adları farklı
3. **Veritabanı nerede?** Supabase / Neon / Vercel Postgres / başka? Havuzlama ayarı buna göre değişiyor
4. **Harita kütüphanesi:** `mapbox-gl` doğrudan mı, `react-map-gl` sarmalayıcısı mı?
5. **Şehir sayfası rotası ne?** `/city/[slug]` mi `/sehir/[id]` mi? Belgede dosya yolları buna göre düzeltilecek
6. **Bu hatalar hep var mıydı, yoksa bir deploy'dan sonra mı başladı?** Sonradan başladıysa o commit'e bakmak en hızlı yol
