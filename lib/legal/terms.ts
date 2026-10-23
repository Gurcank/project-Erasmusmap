import type { LegalDocument, LegalLang } from "./types";

type Values = {
  controller: string;
  email: string;
  law: string;
  updated: string;
};

const tr = ({ controller, email, law, updated }: Values): LegalDocument => ({
  title: "Kullanım Şartları",
  updated: `Son güncelleme: ${updated}`,
  intro: `ErasmusMap'i kullanarak bu şartları kabul etmiş olursun. Siteyi ${controller} işletir. Kişisel verilerinin nasıl işlendiği Gizlilik Politikası'nda anlatılır.`,
  sections: [
    {
      heading: "1. Hesap",
      items: [
        "Giriş yalnızca Google hesabınla yapılır. Hesabın kişiseldir; başkasına devredemez veya paylaşamazsın.",
        "Siteyi kullanmak için en az 16 yaşında olmalısın.",
        "Hesabında olanlardan sen sorumlusun. Yetkisiz bir kullanım fark edersen bize yaz.",
      ],
    },
    {
      heading: "2. Yazdığın içerik",
      paragraphs: [
        "Yorumların, puanların ve yanıtların kendi deneyimini ve görüşünü yansıtmalıdır. Yazdıkların herkese açık olarak görünür. Şunları yapmamalısın:",
      ],
      items: [
        "Hakaret, nefret söylemi, taciz, tehdit veya cinsel şiddet içeren içerik yazmak.",
        "Yasadışı içerik paylaşmak veya başkalarının haklarını (telif, kişilik hakları) ihlal etmek.",
        "Başkasının kişisel verisini (isim, adres, telefon, fotoğraf) izni olmadan paylaşmak.",
        "Yanıltıcı, sahte veya tekrar eden (spam) yorum ya da puan girmek; bir şehri haksız yere yüceltmek veya karalamak için organize olmak.",
        "Siteyi otomatik araçlarla taramak, aşırı yüklemek veya güvenliğini aşmaya çalışmak.",
      ],
    },
    {
      heading: "3. İçerik üzerindeki haklar",
      paragraphs: [
        "Yazdığın içeriğin sahibi sen kalırsın. Siteyi çalıştırmak için bize, içeriğini sitede göstermek, saklamak ve teknik olarak işlemek üzere sınırlı, münhasır olmayan bir izin verirsin. Bu izin içeriğini veya hesabını sildiğinde sona erer.",
      ],
    },
    {
      heading: "4. Denetim",
      paragraphs: [
        "Bazı sözcükler otomatik olarak maskelenir veya incelenmek üzere işaretlenir; yöneticiler bu içerikleri görebilir. Bu şartlara aykırı içeriği uyarmadan kaldırabilir, tekrarlayan veya ağır ihlallerde hesabı askıya alabilir veya silebiliriz.",
      ],
    },
    {
      heading: '5. Hizmet "olduğu gibi" sunulur',
      paragraphs: [
        "Şehir puanları ve yorumlar kullanıcıların kişisel görüşleridir; doğruluğunu, güncelliğini veya eksiksizliğini garanti etmeyiz. Seyahat, konaklama, güvenlik ve harcama kararlarını kendi araştırmanla vermelisin. Seyahat planlayıcıdaki hesaplamalar yalnızca bir yardımcıdır.",
        "Siteyi kesintisiz veya hatasız sunacağımızı vaat etmeyiz; özellikleri değiştirebilir veya kaldırabiliriz.",
      ],
    },
    {
      heading: "6. Sorumluluğun sınırı",
      paragraphs: [
        "Zorunlu hukuk kuralları saklı kalmak üzere, siteyi kullanmandan veya kullanıcı içeriklerinden doğan dolaylı zararlardan sorumlu değiliz. Kasıt veya ağır kusurdan doğan sorumluluğumuz ile yasayla sınırlanamayan haklarını bu şartlar kısıtlamaz.",
      ],
    },
    {
      heading: "7. Hesabını kapatma",
      paragraphs: [
        "Hesabını istediğin zaman Ayarlar sayfasından kalıcı olarak silebilirsin. Silinen hesap ve içerikleri geri getirilemez.",
      ],
    },
    {
      heading: "8. Değişiklikler",
      paragraphs: [
        "Şartları güncelleyebiliriz. Önemli bir değişiklikte sitede duyurur, üstteki tarihi değiştiririz. Değişiklikten sonra siteyi kullanmaya devam etmen, yeni şartları kabul ettiğin anlamına gelir.",
      ],
    },
    {
      heading: "9. Uygulanacak hukuk",
      paragraphs: [
        `${law}. Tüketici olarak zorunlu olarak sana tanınan haklar ve yetkili mercilere başvurma hakkın saklıdır.`,
      ],
    },
    {
      heading: "10. İletişim",
      paragraphs: [`Sorular ve bildirimler için: ${email}`],
    },
  ],
});

const en = ({ controller, email, law, updated }: Values): LegalDocument => ({
  title: "Terms of Use",
  updated: `Last updated: ${updated}`,
  intro: `By using ErasmusMap you accept these terms. The site is operated by ${controller}. How your personal data is processed is explained in the Privacy Policy.`,
  sections: [
    {
      heading: "1. Your account",
      items: [
        "You sign in only with your Google account. Your account is personal; you may not transfer or share it.",
        "You must be at least 16 years old to use the site.",
        "You are responsible for what happens on your account. If you notice unauthorised use, write to us.",
      ],
    },
    {
      heading: "2. What you write",
      paragraphs: [
        "Your reviews, ratings and replies should reflect your own experience and opinion. What you write is shown publicly. You must not:",
      ],
      items: [
        "Write content that is insulting, hateful, harassing, threatening or that glorifies sexual violence.",
        "Share unlawful content or infringe other people's rights (copyright, personality rights).",
        "Share someone else's personal data (name, address, phone number, photo) without their permission.",
        "Post misleading, fake or repeated (spam) reviews or ratings, or organise to unfairly praise or smear a city.",
        "Scrape the site with automated tools, overload it or try to get around its security.",
      ],
    },
    {
      heading: "3. Rights in your content",
      paragraphs: [
        "You remain the owner of what you write. To run the site you give us a limited, non-exclusive permission to show, store and technically process your content on the site. This permission ends when you delete the content or your account.",
      ],
    },
    {
      heading: "4. Moderation",
      paragraphs: [
        "Some words are masked automatically or flagged for review, and administrators can see flagged content. We may remove content that breaks these terms without warning, and suspend or delete accounts for repeated or serious breaches.",
      ],
    },
    {
      heading: '5. The service is provided "as is"',
      paragraphs: [
        "City ratings and reviews are users' personal opinions; we do not guarantee that they are accurate, current or complete. Make your own decisions about travel, accommodation, safety and spending. The calculations in the trip planner are only an aid.",
        "We do not promise the site will be uninterrupted or error-free, and we may change or remove features.",
      ],
    },
    {
      heading: "6. Limit of liability",
      paragraphs: [
        "Subject to mandatory law, we are not liable for indirect damages arising from your use of the site or from user content. These terms do not limit liability for intent or gross negligence, or any right you have that cannot be limited by law.",
      ],
    },
    {
      heading: "7. Closing your account",
      paragraphs: [
        "You can delete your account permanently at any time on the Settings page. A deleted account and its content cannot be restored.",
      ],
    },
    {
      heading: "8. Changes",
      paragraphs: [
        "We may update these terms. For a material change we will announce it on the site and change the date at the top. Continuing to use the site after a change means you accept the new terms.",
      ],
    },
    {
      heading: "9. Governing law",
      paragraphs: [
        `${law}. Rights that mandatory law gives you as a consumer, and your right to turn to the competent authorities, are not affected.`,
      ],
    },
    {
      heading: "10. Contact",
      paragraphs: [`For questions and notices: ${email}`],
    },
  ],
});

export function termsDocument(lang: LegalLang, values: Values) {
  return lang === "tr" ? tr(values) : en(values);
}
