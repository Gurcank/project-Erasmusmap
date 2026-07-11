# 🚀 Proje Profesyonelleştirme Görevi
## Vibe Coding → Production-Ready Dönüşümü

Bu projeyi baştan sona incele ve aşağıdaki aşamaları **sırasıyla** uygula. Amaç: davranışı ve görünümü değiştirmeden projeyi güvenli, temiz, performanslı ve **canlıya çıkmaya hazır** hale getirmek — profesyonel bir şirkette bir yazılım/DevOps ekibinin uygulayacağı standartlarla.

---

## 🔒 Altın Kurallar (Asla İhlal Etme)

1. **Görsel çıktıya dokunma.** UI, layout, renkler, fontlar, spacing, animasyonlar, responsive davranış — hiçbiri değişmemeli. CSS/Tailwind sınıflarını sadece *kesinlikle kullanılmadığından emin olduğunda* sil.
2. **İşlevselliği bozma.** Her aşamadan sonra projenin çalıştığını doğrula: build al, varsa testleri çalıştır, dev server'ı başlatıp konsol hatası olmadığını kontrol et.
3. **Emin olmadığın kodu silme.** Bir kodun kullanılıp kullanılmadığından %100 emin değilsen (dinamik import, string üzerinden çağrı, framework magic olabilir), silme — raporla.
4. **Büyük mimari değişiklik yapma.** Framework/kütüphane değiştirme, klasör yapısını komple bozma gibi radikal adımlar atma. Mevcut yapıyı iyileştir.
5. **Adım adım ilerle, her aşamada anlamlı commit at.** Örn: `fix: XSS açığı kapatıldı`, `refactor: dead code temizliği`, `ci: GitHub Actions pipeline eklendi`.
6. **Yeni görsel öğe gerektiren düzeltmelerde (loading/error state gibi) önce bana sor,** onayımı almadan ekleme.

---

## AŞAMA 0 — 🔍 Keşif ve Baseline

Değişiklik yapmadan önce projeyi tanı:

- Kullanılan dil, framework, kütüphane ve araçları tespit et.
- Build, test, lint ve çalıştırma komutlarını belirle (`package.json` scripts vb.).
- Projenin mevcut halinin **çalıştığını doğrula** (build + dev server + konsol kontrolü). Bu senin karşılaştırma noktan (baseline).
- Bana kısa bir özet sun: "Proje şu teknolojilerle yazılmış, şu komutlarla çalışıyor, şu aşamaları uygulayacağım."

---

## AŞAMA 1 — 🛡️ Güvenlik Taraması ve Düzeltmeleri

*Neden ilk sırada: Güvenlik açığı olan bir projede diğer her şey ikincildir.*

- **XSS:** `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `document.write` kullanımlarını incele; kullanıcı girdisi işleniyorsa sanitize et veya güvenli alternatife çevir.
- **Injection:** SQL/NoSQL sorgularında parametreli sorgu kullanıldığından emin ol. Shell komutu çalıştıran kod varsa girdileri doğrula.
- **Sızan sırlar:** Kod içine gömülü API key, token, şifre, connection string ara. Bulursan `.env`'e taşı, `.env.example` oluştur, `.gitignore`'da `.env` var mı kontrol et. Git geçmişine daha önce commit'lenmiş sır varsa **raporda mutlaka belirt** — anahtarların yenilenmesi gerekir, taşımak yetmez.
- **Girdi doğrulama:** Form ve API endpoint'lerinde eksik validasyonları tamamla (client + varsa server tarafında).
- **Auth/yetkilendirme:** Korumasız endpoint, sadece client-side'da yapılan yetki kontrolü, güvensiz session/token yönetimi var mı kontrol et.
- **Bağımlılık açıkları:** `npm audit` (veya eşdeğerini) çalıştır. Kritik/yüksek açıkları breaking change yaratmadan güncelleyerek kapat. Major sürüm atlaması gerekiyorsa yapma, raporla.
- **HTTP güvenlik header'ları:** Sunucu tarafı varsa CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS gibi header'ları ekle/kontrol et. CORS ayarları aşırı gevşekse (`*` gibi) sıkılaştır veya raporla.
- **Rate limiting:** Form ve API endpoint'lerinde tekrarlı istek/spam koruması var mı? Server tarafı varsa makul bir rate limiting ekle; yoksa öneri olarak raporla.
- **Hassas veri sızıntısı:** Loglanan hassas veriler, hata mesajlarında kullanıcıya sızan iç detaylar (stack trace, DB hatası) varsa temizle.

---

## AŞAMA 2 — 🧹 Dead Code Temizliği

*Neden bu sırada: Ölü kodu temizlemeden yapılan refactor ve optimizasyon boşa emek olur.*

- Hiçbir yerden import edilmeyen dosya, component, fonksiyon ve değişkenleri sil.
- Kullanılmayan import satırlarını temizle.
- `package.json`'daki kullanılmayan bağımlılıkları tespit et; emin olduklarını kaldır, şüphelileri raporla.
- Yorum satırına alınmış eski kod bloklarını sil (git geçmişinde zaten duruyorlar).
- Unreachable kod yollarını, her zaman `false` olan koşulları temizle.
- Kullanılmayan asset'leri (görsel, font, ikon) tespit et ama **silme, raporla** — dinamik kullanılıyor olabilirler.
- Debug amaçlı bırakılmış `console.log`'ları temizle (bilinçli hata loglama hariç).

---

## AŞAMA 3 — ✨ Clean Code ve Okunabilirlik

- **İsimlendirme:** Anlamsız isimleri (`data2`, `temp`, `x`) amacı anlatan isimlerle değiştir. Projedeki mevcut konvansiyona uy.
- **Fonksiyonlar:** Çok uzun, çok iş yapan fonksiyonları mantıklı parçalara böl (tek sorumluluk ilkesi).
- **DRY:** Kopyala-yapıştır kod bloklarını ortak fonksiyon/component'e çıkar — ama zorlamadan; iki benzer kod her zaman aynı kod demek değildir.
- **Magic number/string:** Tekrar eden sabitleri anlamlı isimli sabitlere taşı.
- **İç içe yapılar:** Guard clause / early return ile derin `if` bloklarını sadeleştir.
- **Format tutarlılığı:** Varsa mevcut ESLint/Prettier ayarlarını uygula; yoksa makul bir yapılandırma ekleyip projeyi formatla.
- **Hata yönetimi:** Boş `catch` blokları, sessizce yutulan hatalar, kullanıcıya hiç bildirilmeyen hata durumlarını düzelt.
- **TypeScript varsa:** `any` kullanımlarını mümkün olduğunca gerçek tiplerle değiştir; ama tip zorlaması yüzünden davranış değiştirme.

---

## AŞAMA 4 — 💬 Yorum Satırları

- Kodun *ne yaptığını* tekrarlayan gereksiz yorumları sil (`// döngü başlıyor` gibi).
- Karmaşık iş mantığı, workaround veya "neden böyle yapıldı" bilgisi gereken yerlere kısa, açıklayıcı yorumlar ekle.
- Yanlış/güncelliğini yitirmiş yorumları düzelt veya sil.
- Yorum dilini projede baskın olan dille tutarlı hale getir.
- `TODO`/`FIXME` notlarını topla, raporda listele.

---

## AŞAMA 5 — ⚡ Performans Optimizasyonu

- Gereksiz re-render'ları önle (React ise: gereksiz state, gerçekten fayda sağlayacak yerlerde `useMemo`/`useCallback`/`memo` — her yere serpiştirme).
- Döngü içinde tekrarlanan pahalı hesaplamaları dışarı al.
- Gereksiz/tekrarlı API çağrılarını birleştir veya cache'le.
- Büyük kütüphaneler komple import ediliyorsa tree-shaking dostu import'a çevir.
- Uygun yerlerde lazy loading / code splitting uygula (düşük riskli olanları).
- Görsellere `loading="lazy"` ve eksikse `width`/`height` ekle (görünümü değiştirmediğinden emin olarak).
- Bellek sızıntıları: temizlenmeyen event listener, interval, subscription, abort edilmeyen fetch'leri düzelt.

---

## AŞAMA 6 — ♿ Erişilebilirlik (a11y)

*Görünümü değiştirmeden yapılabilecek düzeltmeler:*

- Tüm görsellere anlamlı `alt` metinleri ekle (dekoratif olanlara boş `alt=""`).
- Buton gibi davranan `div`/`span`'leri gerçek `<button>` yap veya uygun `role` + klavye desteği ekle.
- Form input'larının `label` ile ilişkilendirildiğinden emin ol.
- Klavye ile gezinilebilirliği kontrol et (focus sırası, focus görünürlüğü — mevcut stili bozmadan).
- İnteraktif öğelerde eksik `aria-*` özniteliklerini tamamla.
- Renk kontrastı sorunlarını **tespit et ama düzeltme** (görsel değişiklik gerektirir) — raporla.

---

## AŞAMA 7 — 🔎 SEO ve Semantic HTML

- Her sayfada anlamlı `<title>` ve `meta description` olduğundan emin ol.
- Open Graph ve Twitter Card etiketlerini ekle (paylaşım önizlemeleri için).
- Div çorbası varsa semantic HTML'e çevir: `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>` (görünümü etkilemediğini doğrulayarak).
- Heading hiyerarşisini düzelt (tek `h1`, sıralı h2→h3, atlama yok).
- `robots.txt` ve mümkünse `sitemap.xml` ekle/oluştur.
- `lang` özniteliği, favicon, canonical URL gibi temel eksikleri tamamla.

---

## AŞAMA 8 — 🧩 UX Eksikleri (⚠️ Onay Gerektirir)

Vibe coding projelerinde en sık atlanan durumları **tespit et ve bana listele, onayım olmadan ekleme** (çünkü görsel öğe gerektirirler):

- API çağrıları sırasında loading göstergesi eksikliği
- Hata durumunda kullanıcıya bildirim eksikliği
- Boş liste/sonuç durumu (empty state) eksikliği
- Form gönderiminde çift tıklama koruması eksikliği

---

## AŞAMA 9 — ⚙️ Konfigürasyon ve Ortam Yönetimi

*Profesyonel projelerde kod ile konfigürasyon ayrılır:*

- Hardcoded değerleri (`localhost:3000`, API URL'leri, port numaraları) environment değişkenlerine taşı.
- Development / production ortam ayrımını netleştir; debug flag'lerinin production'da kapalı olduğundan emin ol.
- `.env.example` dosyasını tüm gerekli değişkenlerle (değerleri olmadan, açıklamalarıyla) oluştur/güncelle.
- Lock dosyasının (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`) mevcut ve commit'li olduğundan emin ol — tekrarlanabilir build'ler için şart.
- `package.json`'da `engines` alanıyla desteklenen Node sürümünü belirt (veya `.nvmrc` ekle).

---

## AŞAMA 10 — 🏗️ Build Sağlığı

- Production build al ve **tüm warning'leri** gider (giderilemeyenleri raporla).
- Bundle boyutunu analiz et; anormal büyük parçalar varsa nedenini bul, raporla.
- Kullanılmayan CSS'i tespit et (emin olunanları temizle, şüphelileri raporla).
- Build çıktısının `.gitignore`'da olduğundan emin ol.

---

## AŞAMA 11 — 🧪 Test Altyapısı

- Mevcut test var mı kontrol et; varsa çalıştır ve kırıkları düzelt.
- Yoksa: en kritik iş mantığı için (form validasyonu, hesaplama fonksiyonları, API yardımcıları gibi) **birkaç temel smoke/unit test** ekle — mevcut araçlarla uyumlu, hafif bir test kurulumuyla (örn. Vitest/Jest).
- Kapsamlı test yazmaya çalışma; hangi kısımların öncelikli test edilmesi gerektiğini raporda öner.

---

## AŞAMA 12 — 🐳 DevOps ve Deployment Hazırlığı

*Profesyonel bir şirkette DevOps mühendisinin canlıya çıkmadan önce kurduğu altyapı:*

### Containerization
- Projeye uygun, **multi-stage** bir `Dockerfile` ekle (küçük production imajı için).
- `.dockerignore` oluştur (node_modules, .env, .git vb.).
- Lokal geliştirme için faydalı olacaksa basit bir `docker-compose.yml` ekle.
- İmajın build olup çalıştığını doğrula.

### CI/CD Pipeline
- `.github/workflows/ci.yml` (veya kullanılan platforma uygun eşdeğeri) oluştur. Pipeline şunları içersin:
  1. **Lint** — kod stili kontrolü
  2. **Test** — testlerin çalıştırılması
  3. **Build** — production build'in başarılı olduğunun doğrulanması
  4. **Audit** — bağımlılık güvenlik taraması
- Pipeline'ı push ve pull request'lerde tetiklenecek şekilde ayarla.
- Deployment adımını **ekleme** (hedef platform bilinmiyor) — ama raporda hedef platforma göre nasıl ekleneceğini kısaca öner (Vercel, Netlify, VPS, vb.).

### Operasyonel Hazırlık
- Server tarafı varsa basit bir **health check endpoint'i** ekle (`/health` veya `/api/health` — sadece durum döner).
- Yapılandırılmış, seviyeli **loglama** yaklaşımı kur veya öner (dağınık `console.log` yerine); production'da hassas veri loglanmadığından emin ol.
- **Graceful shutdown:** Server varsa SIGTERM sinyalinde bağlantıları düzgün kapatmayı ekle (container ortamları için önemli).
- **Error tracking:** Sentry gibi bir hata izleme servisi entegrasyonunu **kurma ama öner** — nereye, nasıl ekleneceğini raporda belirt.
- **Monitoring/uptime:** Uygun izleme yaklaşımlarını (uptime kontrolü, log toplama) raporda öner.

---

## AŞAMA 13 — 🗂️ Git Hijyeni

- `.gitignore`'un eksiksiz olduğunu kontrol et: `node_modules`, `.env`, build çıktıları, editor dosyaları (`.vscode`, `.idea`), OS dosyaları (`.DS_Store`).
- Repo'ya yanlışlıkla commit'lenmiş büyük veya gereksiz dosyaları tespit et, raporla (geçmişi temizlemek riskli olduğundan kendin yapma).
- Git geçmişinde sır (API key vb.) taraması yap; bulursan **kritik olarak raporla**.

---

## AŞAMA 14 — 📚 Dokümantasyon

Proje köküne profesyonel bir `README.md` ekle/güncelle:

- Projenin ne olduğu (1-2 cümle)
- Gereksinimler (Node sürümü vb.)
- Kurulum adımları (`npm install` vb.)
- Environment değişkenleri tablosu (`.env.example` ile uyumlu)
- Çalıştırma komutları (dev, build, test, lint)
- Docker ile çalıştırma (Aşama 12'de eklendiyse)
- Deployment notları

---

## AŞAMA 15 — 📊 Final Raporu

Tüm iş bittiğinde bana şu formatta bir özet sun:

| Bölüm | İçerik |
|---|---|
| ✅ Güvenlik | Düzeltilen açıklar (kritik/yüksek/orta/düşük önem sırasıyla) |
| 🗑️ Dead code | Silinen dosya/fonksiyon sayısı, kazanılan satır |
| ✨ Clean code | Yapılan iyileştirmelerin özeti |
| ⚡ Performans | Optimizasyonlar ve beklenen etkileri |
| ♿ / 🔎 A11y & SEO | Yapılan eklemeler, tespit edilip dokunulmayanlar |
| 🐳 DevOps | Eklenen Dockerfile, CI/CD, health check vb. |
| ⚠️ Dokunulmayanlar | Riskli bulup değiştirmediğim noktalar ve nedenleri |
| 🔑 Acil aksiyonlar | Senin yapman gerekenler: sızan anahtarların yenilenmesi, onay bekleyen UX eklemeleri vb. |
| 💡 Öneriler | Major sürüm güncellemeleri, mimari öneriler, monitoring/error tracking kurulumu, öncelikli test alanları |

---

> **Not:** Her aşamayı bitirdiğinde kısaca ne yaptığını söyle ve bir sonraki aşamaya geç. Bir aşamada projeyi bozan bir sorun çıkarsa dur, geri al (`git revert`/`reset`) ve bana bildir.