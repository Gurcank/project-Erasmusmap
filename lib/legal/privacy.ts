import type { LegalDocument, LegalLang } from "./types";

type Values = {
  controller: string;
  email: string;
  upstashRegion: string;
  updated: string;
};

const tr = ({
  controller,
  email,
  upstashRegion,
  updated,
}: Values): LegalDocument => ({
  title: "Gizlilik Politikası",
  updated: `Son güncelleme: ${updated}`,
  intro:
    "ErasmusMap, Erasmus öğrencilerinin Avrupa şehirlerini keşfetmesi ve değerlendirmesi için bir platformdur. Bu metin, hangi kişisel verini neden işlediğimizi, kimlerle paylaştığımızı ve haklarını nasıl kullanabileceğini anlatır. Avrupa Birliği'nde ve Türkiye'de yaşayan kullanıcılar için GDPR ve KVKK çerçevesinde hazırlanmıştır.",
  sections: [
    {
      heading: "1. Veri sorumlusu",
      paragraphs: [
        `Verilerinin işlenme amaçlarını ve yöntemlerini belirleyen veri sorumlusu: ${controller}.`,
        `İletişim ve haklarını kullanmak için başvuru adresi: ${email}`,
      ],
    },
    {
      heading: "2. Hangi verileri işliyoruz",
      paragraphs: ["Üç kaynaktan veri alırız:"],
      items: [
        "Google ile girişten: adın ve e-posta adresin. Google profil fotoğrafını saklamayız ve göstermeyiz; profilinde sitenin hazır avatarlarından birini seçersin.",
        "Senin eklediklerinden: kullanıcı adın, biyografin, konumun ve avatar seçimin; yazdığın yorumlar, puanlar ve yanıtlar; beğenilerin; gittiğin, gitmek istediğin ve favori şehirlerin ile ziyaret tarihlerin; takip ettiğin ve engellediğin kişiler; seyahat planların (başlık, açıklama, tarihler, bütçe, ulaşım ve konaklama kayıtları, rezervasyon numaraları, notlar, harcamalar, yapılacaklar).",
        "Teknik olarak: IP adresin (şehir araması ve sağlık kontrolü gibi herkese açık uç noktalarda kötüye kullanımı sınırlamak için yaklaşık bir dakika boyunca), oturum çerezlerin ve barındırma sağlayıcısının sunucu günlükleri.",
      ],
    },
    {
      heading: "3. Neden işliyoruz, hukuki dayanak",
      items: [
        "Hesabını açmak, yorumlarını ve planlarını saklamak ve göstermek: sözleşmenin ifası (GDPR m. 6/1-b; KVKK m. 5/2-c).",
        "Hesapları ve siteyi kötüye kullanıma karşı korumak, hız sınırı uygulamak, uygunsuz içeriği denetlemek: meşru menfaat (GDPR m. 6/1-f; KVKK m. 5/2-f).",
        "Kanundan doğan yükümlülükler: yetkili makamların hukuka uygun talepleri (GDPR m. 6/1-c; KVKK m. 5/2-a).",
      ],
      after: [
        "Açık rızana dayanan bir işleme yapmıyoruz. Verilerini pazarlama amacıyla kullanmıyor, satmıyoruz ve profil çıkarma veya otomatik karar verme yapmıyoruz.",
      ],
    },
    {
      heading: "4. Kimlerin görebildiği",
      paragraphs: [
        "Kullanıcı adın, avatarın, biyografin, konumun, yorumların, yanıtların, ziyaret ettiğin şehirler ve tarihleri, favorilerin ve herkese açık olarak işaretlediğin seyahat planların siteyi ziyaret eden herkes tarafından görülebilir. Özel seyahat planlarını yalnızca sen görürsün. E-posta adresini diğer kullanıcılar görmez; siteyi yöneten yöneticiler moderasyon için görebilir.",
        "Birini engellediğinde ikiniz de birbirinizin içeriğini görmezsiniz.",
      ],
    },
    {
      heading: "5. Hizmet sağlayıcılar ve yurt dışına aktarım",
      paragraphs: [
        "Verilerini şu hizmet sağlayıcılar aracılığıyla işleriz. Hepsi, bizim adımıza veya kendi hizmetleri kapsamında, yalnızca ilgili işi yapmak için veri alır:",
      ],
      items: [
        "Vercel Inc. (ABD): siteyi barındırır; sunucu tarafı kodu şu anda Vercel'in ABD Doğu (Washington D.C.) bölgesinde çalışır. İsteğe bağlı istatistik tercihini kabul edersen, çerez kullanmayan, toplu ziyaret istatistikleri için Vercel Analytics'i yükleriz.",
        "Supabase (veritabanı): hesabın ve içeriklerin Dublin'de (İrlanda, AB) bulunan bir PostgreSQL veritabanında saklanır.",
        "Google (ABD): giriş için kimlik doğrular. Google, ErasmusMap'e giriş yaptığını bilir.",
        `Upstash (hız sınırı): kısa süreli sayaçlar tutar; veritabanı bölgesi: ${upstashRegion}. Sayaç anahtarlarında kullanıcı kimliğin veya (giriş yapmamışsan) IP adresin bulunabilir.`,
        "Mapbox (ABD): harita ve uydu görüntülerini sunar. Haritayı göstermek için tarayıcın harita karolarını ve stil dosyalarını doğrudan Mapbox'tan alır; bu yüzden IP adresin ve cihaz bilgin Mapbox'a ulaşır. Mapbox'ın harita kullanım olayları (haritanın yüklendiğini bildiren istekler) yalnızca isteğe bağlı istatistikleri kabul edersen gönderilir; performans ölçümlerini hiçbir durumda göndermeyiz.",
        "Unsplash (ABD): şehir fotoğraflarını sunar. Fotoğrafları tarayıcın doğrudan Unsplash'ten yükler; IP adresin Unsplash'e ulaşır.",
      ],
      after: [
        "ABD'deki sağlayıcılara yapılan aktarımlar; sağlayıcıların kendi sözleşmesel güvencelerine (standart sözleşme hükümleri veya yeterlilik kararları kapsamındaki programlar) dayanır. Güvencelerin bir kopyasını talep etmek için bize yazabilirsin.",
      ],
    },
    {
      heading: "6. Ne kadar saklıyoruz",
      items: [
        "Hesabın ve içeriklerin, hesabını silene kadar saklanır. Hesabını sildiğinde yorumların, yanıtların, beğenilerin, listelerin, takip ve engel kayıtların ve seyahat planların da birlikte, geri alınamaz şekilde silinir.",
        "Hız sınırı sayaçları yaklaşık bir dakika sonra kendiliğinden kaybolur.",
        "Barındırma sağlayıcısının sunucu günlükleri, sağlayıcının kendi saklama süresine tabidir.",
        "Düzenli yedek almıyoruz; sildiğin veri yedeklerde kalmaz.",
      ],
    },
    {
      heading: "7. Çerezler ve yerel depolama",
      items: [
        "Zorunlu çerezler: giriş yaptığında oturumunu tanıyan ve yetkisiz isteklere karşı koruyan next-auth çerezleri (oturum, CSRF ve yönlendirme). Oturum çerezi varsayılan olarak 30 gün geçerlidir. Bunlar olmadan giriş çalışmaz.",
        "Tercih çerezi (consent): isteğe bağlı istatistik tercihini 6 ay boyunca hatırlar ve yalnızca bu tercihi içerir.",
        "Tarayıcının yerel depolaması: seçtiğin tema ve arayüz dili; yalnızca senin cihazında kalır.",
        "İsteğe bağlı istatistikler: yalnızca kabul edersen Vercel Analytics yüklenir (çerez kullanmaz, seni takip etmez, yalnızca toplu sayımlar tutar) ve Mapbox harita kullanım olayları gönderilir. Reddedersen ikisi de çalışmaz. Tercihini bu sayfanın altındaki bölümden istediğin zaman değiştirebilirsin.",
      ],
    },
    {
      heading: "8. Haklarını nasıl kullanırsın",
      paragraphs: [
        "GDPR ve KVKK kapsamında verilerine erişme, düzeltme, silme, işlenmesini kısıtlama, itiraz etme ve verini taşıma hakkın var.",
      ],
      items: [
        'Erişim ve taşınabilirlik: Ayarlar sayfasındaki "Verilerimi indir" ile tüm verini JSON dosyası olarak alırsın.',
        'Silme: Ayarlar sayfasındaki "Hesabımı sil" ile hesabını ve tüm içeriğini kalıcı olarak silersin.',
        "Düzeltme: Profilini ve içeriklerini kendin düzenleyebilirsin.",
        `Diğer talepler için ${email} adresine yazabilirsin. En geç bir ay içinde yanıt veririz.`,
        "Şikâyet: Yanıtımızdan memnun kalmazsan Türkiye'de Kişisel Verileri Koruma Kurulu'na, Avrupa Birliği'nde yaşıyorsan yaşadığın ülkenin veri koruma otoritesine başvurabilirsin.",
      ],
    },
    {
      heading: "9. Yaş sınırı",
      paragraphs: [
        "ErasmusMap 16 yaşın altındaki kişilere yönelik değildir. 16 yaşın altında olduğunu fark ettiğimiz hesapları sileriz.",
      ],
    },
    {
      heading: "10. Değişiklikler",
      paragraphs: [
        "Bu metni güncelleyebiliriz. Önemli bir değişiklikte sitede duyurur, üstteki güncelleme tarihini değiştiririz.",
      ],
    },
  ],
});

const en = ({
  controller,
  email,
  upstashRegion,
  updated,
}: Values): LegalDocument => ({
  title: "Privacy Policy",
  updated: `Last updated: ${updated}`,
  intro:
    "ErasmusMap is a platform for Erasmus students to discover and review European cities. This text explains which personal data we process and why, who we share it with, and how you can use your rights. It is written for users in the European Union and Turkey under the GDPR and the Turkish KVKK.",
  sections: [
    {
      heading: "1. Who is responsible",
      paragraphs: [
        `The controller, who decides why and how your data is processed, is ${controller}.`,
        `To contact us or use your rights: ${email}`,
      ],
    },
    {
      heading: "2. What data we process",
      paragraphs: ["We receive data from three sources:"],
      items: [
        "From signing in with Google: your name and email address. We do not store or show your Google profile photo; you choose one of the site's preset avatars instead.",
        "From what you add: your username, bio, location and avatar choice; the reviews, ratings and replies you write; your likes; the cities you have visited, want to visit or favourite, and your visit dates; the people you follow and block; your trip plans (title, description, dates, budget, transport and stay entries, booking references, notes, expenses, to-dos).",
        "Technically: your IP address (for about a minute, to limit abuse on public endpoints such as city search and the health check), your session cookies, and the hosting provider's server logs.",
      ],
    },
    {
      heading: "3. Why we process it, and on what basis",
      items: [
        "Creating your account, and storing and showing your reviews and plans: performance of a contract (GDPR Art. 6(1)(b); KVKK Art. 5/2-c).",
        "Protecting accounts and the site against abuse, applying rate limits and reviewing inappropriate content: legitimate interests (GDPR Art. 6(1)(f); KVKK Art. 5/2-f).",
        "Legal obligations: lawful requests from competent authorities (GDPR Art. 6(1)(c); KVKK Art. 5/2-a).",
      ],
      after: [
        "We do not process anything on the basis of your consent. We do not use your data for marketing, we do not sell it, and we do not profile you or make automated decisions.",
      ],
    },
    {
      heading: "4. Who can see it",
      paragraphs: [
        "Your username, avatar, bio, location, reviews, replies, the cities you visited and their dates, your favourites and the trip plans you mark public can be seen by anyone visiting the site. Private trip plans are visible only to you. Other users cannot see your email address; the administrators who run the site can see it for moderation.",
        "When you block someone, neither of you sees the other's content.",
      ],
    },
    {
      heading: "5. Service providers and transfers abroad",
      paragraphs: [
        "We process your data through the following providers. Each receives data only to do its job, on our behalf or as part of its own service:",
      ],
      items: [
        "Vercel Inc. (USA): hosts the site; the server-side code currently runs in Vercel's US East (Washington D.C.) region. If you accept the optional statistics choice, we load Vercel Analytics for aggregate visit statistics; it uses no cookies.",
        "Supabase (database): your account and content are stored in a PostgreSQL database in Dublin (Ireland, EU).",
        "Google (USA): verifies your identity when you sign in. Google knows you signed in to ErasmusMap.",
        `Upstash (rate limiting): keeps short-lived counters; database region: ${upstashRegion}. Counter keys can contain your user id or, if you are not signed in, your IP address.`,
        "Mapbox (USA): serves the map and satellite imagery. To show the map, your browser fetches map tiles and styles directly from Mapbox, so your IP address and device information reach Mapbox. Mapbox's map usage events (the requests that report a map was loaded) are sent only if you accept the optional statistics; we never send its performance measurements.",
        "Unsplash (USA): serves city photos. Your browser loads them directly from Unsplash, so your IP address reaches Unsplash.",
      ],
      after: [
        "Transfers to providers in the USA rely on the providers' own contractual safeguards (standard contractual clauses or adequacy-based programmes). You can write to us to ask for a copy.",
      ],
    },
    {
      heading: "6. How long we keep it",
      items: [
        "Your account and content are kept until you delete your account. When you delete it, your reviews, replies, likes, lists, follows, blocks and trip plans are deleted with it, irreversibly.",
        "Rate-limit counters disappear on their own after about a minute.",
        "The hosting provider's server logs follow that provider's own retention period.",
        "We do not take regular backups, so data you delete does not linger in backups.",
      ],
    },
    {
      heading: "7. Cookies and local storage",
      items: [
        "Essential cookies: the next-auth cookies that recognise your session when you are signed in and protect against forged requests (session, CSRF and redirect). The session cookie is valid for 30 days by default. Signing in does not work without them.",
        "Choice cookie (consent): remembers your optional statistics choice for 6 months and holds nothing but that choice.",
        "Your browser's local storage: the theme and interface language you chose; it stays on your device only.",
        "Optional statistics: only if you accept, Vercel Analytics is loaded (it uses no cookies, does not track you and only keeps aggregate counts) and Mapbox's map usage events are sent. If you refuse, neither runs. You can change your choice at any time in the section at the bottom of this page.",
      ],
    },
    {
      heading: "8. How to use your rights",
      paragraphs: [
        "Under the GDPR and the KVKK you have the right to access, correct and delete your data, to restrict or object to its processing, and to take it with you.",
      ],
      items: [
        'Access and portability: "Download my data" on the Settings page gives you everything as a JSON file.',
        'Erasure: "Delete my account" on the Settings page permanently deletes your account and all your content.',
        "Correction: you can edit your profile and your content yourself.",
        `For anything else write to ${email}. We reply within one month at the latest.`,
        "Complaints: if you are not satisfied with our answer you can complain to the Turkish Personal Data Protection Authority or, if you live in the European Union, to the data protection authority of your country.",
      ],
    },
    {
      heading: "9. Age limit",
      paragraphs: [
        "ErasmusMap is not meant for anyone under 16. We delete accounts we find belong to someone under 16.",
      ],
    },
    {
      heading: "10. Changes",
      paragraphs: [
        "We may update this text. For a material change we will announce it on the site and change the date at the top.",
      ],
    },
  ],
});

export function privacyDocument(lang: LegalLang, values: Values) {
  return lang === "tr" ? tr(values) : en(values);
}
