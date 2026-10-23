# Runbook

Canlı sistemi işletirken yapılacak işlerin adım adım kılavuzu. Mimari için
[ARCHITECTURE.md](ARCHITECTURE.md), kurulum için [README](../README.md).

> **Altın kural:** Production veritabanını değiştiren her işlem (migration, silme,
> elle SQL) **önce okunur, sonra onaylanır, sonra uygulanır**. Yerel `.env.local`
> içindeki `DATABASE_URL` production'a işaret edebilir; yazma akışlarını yerelde
> denemeden önce bunu kontrol et. Ayrı bir staging veritabanı yok.

## İçindekiler

1. [Deploy ve geri alma](#deploy-ve-geri-alma)
2. [Veritabanı migration'ı](#veritabanı-migrationı)
3. [Yasal sayfaları yayına almak](#yasal-sayfaları-yayına-almak)
4. [Admin atamak](#admin-atamak)
5. [Sır (secret) rotasyonu](#sır-secret-rotasyonu)
6. [Yedek ve geri dönüş](#yedek-ve-geri-dönüş)
7. [Bir kullanıcının verisi: dışa aktarma ve silme](#bir-kullanıcının-verisi)
8. [Hata ayıklama](#hata-ayıklama)
9. [Bakım listesi](#bakım-listesi)

## Deploy ve geri alma

`main`'e merge edilen her şey Vercel'de **Production** olarak yayına çıkar. Önce şunlar
yeşil olmalı: `lint`, `test`, `build`, `database`, `audit` (bkz. [README → CI/CD](../README.md#cicd)).

**Deploy sonrası kontrol** (1–2 dakika içinde):

```bash
for p in /api/health / /meydan /c/berlin /login; do
  printf "%-14s " $p; curl -s -o /dev/null -w "%{http_code}\n" https://erasmusmap.vercel.app$p
done
```

Hepsi `200` dönmeli. `/api/health` veritabanına erişemiyorsa `503` verir.
Yasal sayfalar yayında değilken `/privacy` ve `/terms` **404** döner; bu bir hata değildir
(bkz. [Yasal sayfaları yayına almak](#yasal-sayfaları-yayına-almak)).

**Geri alma:** Vercel → proje → **Deployments** → önceki başarılı deploy →
**Promote to Production**. Kod geri alınır, **veritabanı geri alınmaz.** Bu yüzden
migration'lar [expand/contract](#veritabanı-migrationı) sırasıyla uygulanır: eski kod,
yeni şemayla da çalışabilmeli.

## Veritabanı migration'ı

Migration'lar deploy'la birlikte **uygulanmaz**; elle, korumalı bir workflow ile uygulanır.

1. Migration'ı içeren PR'ı `main`'e merge et. Workflow bekleyen migration'ları raporlar
   (Actions → **Production database** → job özeti).
2. Migration **ekleyense** (kolon, tablo, index, kısıt) onu kullanan koddan _önce_, silen migration ise
   (`DROP`) onu kullanmayan kod yayına çıktıktan _sonra_ uygula. Aynı PR'da şema ve kod
   birlikte olamaz; PR'ı ikiye böl.
3. Actions → **Production database → Run workflow** (`main`). `confirm` kutusuna `APPLY` yaz.
4. Veri silebilen bir migration ise `allow_destructive` kutusunu da işaretle. Bunu yapmadan
   önce **neyin silineceğini sayarak** doğrula (aşağıya bak).
5. Workflow bittiğinde "bekleyen migration kalmadı" satırını ve yeşil sonucu gör.

**Silici migration'dan önce sayım örneği** (Supabase → SQL Editor):

```sql
SELECT count(*) FROM "User" WHERE image IS NOT NULL;
```

**Şu an bekleyen:** `20261022160000_drop_photo_storage` (`TripPhoto` tablosunu ve
`User.image` / `User.imagePath` kolonlarını siler). Uygulamadan önce Supabase →
Storage'da `avatars` ve `trip-media` bucket'larının **elle boşaltıldığından** emin ol;
migration yalnızca veritabanını temizler, dosyalara dokunmaz.

**Elle uygulamak gerekirse** (workflow kullanılamıyorsa): `DIRECT_URL` (port `5432`,
pgbouncer yok) ile `npx prisma migrate status`, ardından `npx prisma migrate deploy`.
`migrate dev` ve `migrate reset` production'a **asla** karşı çalıştırılmaz.

**Şema ile migration uyuşmuyor** (`database` job'u kırmızı): `schema.prisma`'yı değiştirdin ama
migration'ı eklemedin (ya da tersi). Yerelde boş bir veritabanıyla
`npx prisma migrate dev --name <ad>` çalıştırıp çıkan dosyayı ekle. Prisma `CHECK`
kısıtlarını karşılaştırmaz; onlar yalnızca migration dosyalarında yaşar.

## Yasal sayfaları yayına almak

Gizlilik politikası ve kullanım şartları, siteyi işleten kişinin bilgilerini içerir.
Bunlar [`lib/legal/config.ts`](../lib/legal/config.ts) içinde köşeli parantezli
yer tutucular olarak durur. **Yer tutucu kaldığı sürece production'da** `/privacy` ve
`/terms` 404 döner, sitemap'te listelenmez, giriş ekranındaki "şartları kabul ediyorsun"
notu ve çerez banner'ındaki politika linki gösterilmez. Build **bozulmaz** (takılan bir
build, arkasındaki güvenlik düzeltmelerini de tutar).

Yayına almak için:

1. `lib/legal/config.ts` içinde şunları doldur: `controllerName`, `contactEmail`,
   `upstashRegion` (Upstash panelindeki bölge), `governingLaw.tr` / `governingLaw.en`.
   `lastUpdated` tarihini güncelle.
2. Metinleri ([`lib/legal/privacy.ts`](../lib/legal/privacy.ts),
   [`terms.ts`](../lib/legal/terms.ts)) bir hukukçuya okut; özellikle yaş sınırı (16),
   "bir ay içinde yanıt" taahhüdü ve yedekleme cümlesi senin gerçek uygulamanla uyuşmalı.
3. PR → `main`. Sayfalar yayına çıkar. Kontrol: `/privacy` ve `/terms` `200`, sitemap'te var.
4. İsteğe bağlı: Vercel proje ortam değişkenlerine `REQUIRE_LEGAL_CONFIG=1` ekle. Bundan
   sonra yer tutucu geri gelirse production build'i **bilerek** kırılır.

## Admin atamak

Arayüzde admin atama yok; rol veritabanında tutulur. Kişi **önce bir kez Google ile giriş
yapmış** olmalı (kaydı oluşsun). Sonra Supabase → SQL Editor:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'kisi@ornek.com';
```

Rol veritabanından okunduğu için etki bir sonraki istekte başlar. Adminin kendi hesabını
silmesi, **son admin** ise engellenir. Geri almak için `role = 'USER'`.

## Sır (secret) rotasyonu

Bir sır sızdıysa ya da düzenli döndürmek istiyorsan. Önce yeni değeri üret, Vercel'e koy,
**redeploy** et (`NEXT_PUBLIC_*` değerleri build'e gömülür; değişiklik yeni deploy ister),
sonra eskisini iptal et.

| Sır                           | Nerede üretilir                         | Notlar                                                                                  |
| ----------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`             | `openssl rand -base64 32`               | Döndürmek **herkesin oturumunu kapatır** (JWT imzası değişir).                          |
| `GOOGLE_CLIENT_SECRET`        | Google Cloud Console → Kimlik bilgileri | Yeni sır oluştur, Vercel'e koy, redeploy, eskisini sil.                                 |
| `DATABASE_URL` / `DIRECT_URL` | Supabase → Database → parola            | Parolayı sıfırlayınca ikisini de güncelle; GitHub secret `DIRECT_URL` de güncellenmeli. |
| `NEXT_PUBLIC_MAPBOX_TOKEN`    | Mapbox → Tokens                         | Tarayıcıya açık; token'ı **URL kısıtlamasıyla** sınırla. Döndürmek redeploy ister.      |
| `UNSPLASH_ACCESS_KEY`         | Unsplash → Applications                 | Sunucu tarafı; yalnızca şehir fotoğrafı çekmede kullanılır.                             |
| `UPSTASH_REDIS_REST_TOKEN`    | Upstash → Database → REST API           | Değilse rate limit instance başına bellek içine düşer.                                  |

OAuth erişim/yenileme token'ları veritabanında **tutulmaz** (kimlik alanları dışında
hiçbir şey saklanmaz), bu yüzden bir veritabanı sızıntısı Google hesaplarına erişim vermez.

## Yedek ve geri dönüş

> **Durum:** Supabase ücretsiz planında otomatik yedek **yoktur** ve henüz zamanlanmış bir
> yedek kurulu değildir. Gizlilik politikası da "düzenli yedek almıyoruz" der. Zamanlanmış
> `pg_dump` kurulursa bu bölüm ve politika birlikte güncellenmelidir.

> **Karar (23 Ekim 2026): şimdilik zamanlanmış yedek yok.** Değerlendirilen seçenekler:
>
> - _GitHub Actions artifact'ı:_ repo **public** olduğundan artifact'ları GitHub hesabı olan
>   herkes indirebilir. Bu yüzden yalnızca **açık anahtarlı** şifreleme (ör. `age`; özel anahtar
>   sadece sahibinde, çevrimdışı) kabul edilebilir; parolayı bir repo secret'ında tutmak yetmez,
>   çünkü secret'a erişen bir workflow değişikliği hem parolayı hem herkese açık şifreli yedeği
>   ele geçirtir. Kişisel veri, şifreli de olsa herkese açık bir yerde durur.
> - _Özel bir S3/R2 bucket'ı:_ en güvenli seçenek; bucket ve erişim anahtarını sahibi
>   oluşturur, gizlilik politikasına yeni bir alt işleyici eklenir.
>
> İkisi için de yedeğin silme isteklerine etkisi (yedekte kalan veri en fazla saklama süresi
> kadar yaşar) gizlilik politikasının "Ne kadar saklıyoruz" bölümüne yazılmalıdır.

Elle yedek (yerelde, `DIRECT_URL` ile):

```bash
pg_dump "$DIRECT_URL" --no-owner --format=custom --file=erasmusmap-$(date +%F).dump
```

Dosyayı şifreli ve repo dışında sakla (içinde kullanıcı e-postaları vardır).
Geri yükleme **boş bir** veritabanına yapılır, production'ın üzerine değil:

```bash
pg_restore --no-owner --dbname "$TARGET_URL" erasmusmap-YYYY-MM-DD.dump
```

Büyük bir silme veya migration öncesinde bu yedeği almak, geri dönüşün tek yoludur.

## Bir kullanıcının verisi

- **Dışa aktarma:** kullanıcı Ayarlar → "Verilerimi indir" ile kendi JSON'unu alır
  (`/api/account/export`).
- **Silme:** Ayarlar → "Hesabımı sil". Hesap ve tüm içeriği (yorumlar, cevaplar, ziyaretler,
  planlar) kalıcı silinir; yorumlar yetim bırakılmaz. Son admin silinemez.
- Elle silmek gerekirse veritabanında `User` satırını silmek yeter; ilişkili içerik
  `ON DELETE CASCADE` ile gider.

## Hata ayıklama

- **Sunucu hataları:** Vercel → proje → **Logs**. Her hata tek satırlık JSON'dur; ara:
  `"level":"error"`. Alanlar: `route`, `routeType` (`render`/`route`/`action`), `code`,
  `error.digest`. Kullanıcıya gösterilen hata sayfasındaki `digest` kodu, log satırındaki
  `error.digest` ile aynıdır.
- **E-posta, token, sorgu parametresi, başlık ve veritabanı adresi loglara yazılmaz.**
  Bir log'da bunlardan birini görürsen bu bir hata; `lib/logger.ts` ve
  `lib/logger.test.ts`'e bak.
- **İstemci tarafı hatalar** hiçbir yere gönderilmez (izleme servisi yok).
- **"Giriş yapamıyorum":** `banned` mi? (`SELECT banned FROM "User" WHERE email = '…'`).
  Yasaklı kullanıcı `AccessDenied` ile geri döner. Değilse `NEXTAUTH_URL` ve Google OAuth
  yönlendirme adreslerini kontrol et.
- **`/api/health` 503:** veritabanına erişilemiyor. Supabase durumuna ve `DATABASE_URL`'a bak.
- **Rate limit (429):** `UPSTASH_*` yoksa limit instance başına çalışır; üretimde tanımlı olmalı.
- **Sitemap / canonical `localhost` gösteriyor:** Vercel'de `NEXT_PUBLIC_SITE_URL`
  localhost'a ayarlı olabilir. Kod bunu Vercel üzerinde yok sayar; yine de değişkeni
  gerçek alan adına çevir ya da sil.

## Bakım listesi

| Sıklık            | İş                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------- |
| Haftalık          | Dependabot PR'larını (minor/patch gruplu) incele ve merge et.                      |
| Her migration     | `Production database` workflow'unun bekleyen raporunu kontrol et.                  |
| Aylık             | `npm audit --omit=dev`; Supabase ve Vercel kota kullanımına bak.                   |
| Yılda bir         | Sırları döndür; `lib/legal/config.ts` `lastUpdated` ve metinleri gözden geçir.     |
| Sürüm yükseltmesi | Node'u Vercel proje ayarında `24.x` tut (bkz. `.nvmrc`, `package.json` `engines`). |
