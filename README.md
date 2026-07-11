# 🌍 ErasmusMap

Erasmus öğrencileri için Avrupa şehirlerini keşfetme ve değerlendirme platformu.

**🔗 [project-erasmus.vercel.app](https://project-erasmus.vercel.app)**

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

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router) |
| Dil | TypeScript |
| Stil | Tailwind CSS v4 |
| Harita | Mapbox GL |
| Auth | NextAuth.js v4 |
| ORM | Prisma |
| Veritabanı | PostgreSQL (Supabase) |
| Deploy | Vercel |
| Fotoğraf | Unsplash API |

---

## Kurulum

### Gereksinimler

- Node.js 18+
- PostgreSQL veritabanı (Supabase önerilir)

### Adımlar
```bash
# Repoyu klonla
git clone https://github.com/Gurcank/project-erasmus.git
cd project-erasmus

# Bağımlılıkları yükle
npm install
```

`.env.local` dosyası oluştur:
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=...
UNSPLASH_ACCESS_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
```bash
# Veritabanı migration
npx prisma migrate deploy

# Şehirleri ekle
npx prisma db seed

# Geliştirme sunucusunu başlat
npm run dev
```

---

## Lisans

MIT
