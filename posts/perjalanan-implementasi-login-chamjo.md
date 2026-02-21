---
title: Perjalanan Implementasi Fitur Login di Chamjo Design
date: 2026-02-21
excerpt: Bagaimana Chamjo mengimplementasikan sistem autentikasi dengan Supabase, integrasi payment dengan LemonSqueezy, dan transformasi signifikan pada landing page.
---

## Awal Mula

Chamjo Design, platform eksplorasi aplikasi dari berbagai negara, memulai perjalanannya pada **9 Mei 2024**. Sejak awal, tim sudah memiliki visi yang jelas: sebuah platform yang membutuhkan autentikasi pengguna untuk memberikan pengalaman personalized.

Dua hari setelah repository dibuat, tepatnya pada **11 Mei 2024**, implementasi autentikasi mulai digarap dengan dua file kunci:
- `src/config/auth.ts` - Konfigurasi Supabase client
- `src/hooks/useAuth.ts` - Custom hook untuk state management autentikasi

## Memilih Supabase sebagai Auth Provider

Keputusan untuk menggunakan **Supabase** sebagai authentication provider bukan tanpa alasan. Supabase menawarkan beberapa keuntungan:

1. **Open Source** - Bisa di-host sendiri jika diperlukan
2. **Built-in Auth** - Tidak perlu membangun sistem auth dari nol
3. **Social Login** - Mudah integrasi dengan Google, GitHub, dll
4. **Real-time Database** - Bonus fitur yang bisa dimanfaatkan nanti

```typescript
// Konfigurasi Supabase SSR Client
import { createBrowserClient } from "@supabase/ssr"

export const supabaseSsrClient = createBrowserClient(
  publicURL!, 
  supabasePublicKey
)
```

Implementasi auth menggunakan pendekatan SSR (Server-Side Rendering) untuk keamanan yang lebih baik dan support untuk Next.js App Router.

## Login dengan Google - Pilihan yang Strategis

Pada **17 Mei 2024**, komponen `ModalLogin.tsx` dibuat dengan fokus pada **Google Sign-In**. Pilihan ini didasarkan pada:

- **User Experience** - Mayoritas pengguna sudah memiliki akun Google
- **Kepercayaan** - Google adalah provider OAuth yang sudah dikenal
- **Implementasi Cepat** - Supabase sudah menyediakan abstraction untuk Google OAuth

```tsx
const handleLogin = async () => {
  try {
    setLoading(true)
    toast.loading("Please wait...")
    await signInWithGoogle()
  } catch (error) {
    toast.error("Failed to login")
  }
}
```

Modal login dirancang dengan pendekatan **mobile-first** menggunakan Bottom Sheet untuk tampilan mobile dan Modal untuk desktop.

## Transformasi Landing Page

Salah satu perubahan paling signifikan adalah bagaimana landing page bertransformasi seiring dengan implementasi autentikasi.

### Sebelum Login (Guest User)

Landing page menampilkan:
- **Hero Section** - Value proposition Chamjo
- **Content Section** - Penjelasan fitur
- **Trusted Section** - Social proof
- **Benefit Section** - Keuntungan menggunakan Chamjo
- **Benchmark Section** - Perbandingan dengan kompetitor
- **FAQ Section** - Pertanyaan yang sering diajukan
- **CTA Section** - Call to action untuk mendaftar

### Setelah Login (Authenticated User)

Pengguna yang sudah login akan langsung di-redirect ke `/browse`:

```typescript
const Home = async () => {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()

  if (data?.user) {
    redirect("/browse")  // Langsung ke halaman browse
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Content />
        {/* ... landing page sections */}
      </main>
    </>
  )
}
```

### Proteksi Halaman Browse

Halaman `/browse` yang berisi konten utama Chamjo juga diproteksi:

```typescript
const Browse = async (props: BrowseProps) => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect("/")  // Kembali ke landing page jika belum login
  }

  return <MainPage {...props} />
}
```

## Integrasi Payment dengan LemonSqueezy

Pada **Oktober 2025**, Chamjo mengambil langkah besar dengan mengintegrasikan sistem pembayaran menggunakan **LemonSqueezy**. Ini membawa perubahan signifikan:

### Feature Flag untuk Payment

```typescript
const { enabled: paymentEnabled } = await getFeatureFlag(
  FEATURE_FLAG_KEY.PAYMENT_ACTIVE, 
  data?.user?.email
)
```

Penggunaan feature flag memungkinkan tim untuk:
- Rollout bertahap ke pengguna tertentu
- Testing A/B untuk fitur premium
- Emergency toggle jika ada masalah

### Subscription Badge di Navbar

Setelah integrasi payment, navbar menampilkan status subscription pengguna:

```typescript
interface Profile extends User {
  lemonsqueezyonprofile?: {
    status: string
    store_id: string
    customer_id: string
    subscriptions: any[]
  }
}
```

## Timeline Perkembangan

| Tanggal | Milestone |
|---------|-----------|
| 9 Mei 2024 | Repository dibuat dengan Initial Commit |
| 11 Mei 2024 | Implementasi `auth.ts` dan `useAuth.ts` |
| 17 Mei 2024 | Komponen `ModalLogin.tsx` dibuat |
| 12 Oktober 2024 | Landing page dengan sections lengkap |
| 10 November 2024 | Release pertama (v3.0.2) |
| Oktober 2025 | Integrasi LemonSqueezy payment |
| 19 Oktober 2025 | Release v4.0.0 dengan payment feature |
| Januari 2026 | Release v4.2.x dengan stabilisasi payment |

## Lessons Learned

### 1. Autentikasi Harus Dari Awal

Memulai dengan auth sejak hari pertama membuat arsitektur lebih clean. Tidak perlu retrofit auth ke sistem yang sudah kompleks.

### 2. SSR untuk Security

Menggunakan Supabase SSR client memberikan keamanan yang lebih baik karena token dikelola di server-side.

### 3. Feature Flag adalah Teman

Integrasi payment dengan feature flag membuat deployment lebih aman dan kontrollable.

### 4. UX-First Approach

Modal login yang responsif (Bottom Sheet untuk mobile, Modal untuk desktop) menunjukkan perhatian terhadap user experience.

## Tech Stack Final

- **Frontend**: Next.js dengan App Router
- **Auth**: Supabase Auth dengan SSR support
- **OAuth**: Google Sign-In
- **Payment**: LemonSqueezy
- **Feature Flag**: Custom implementation dengan Supabase database
- **State Management**: React Hooks dengan custom hooks pattern

## Penutup

Perjalanan Chamjo dalam mengimplementasikan fitur login menunjukkan bahwa dengan perencanaan yang matang dan pilihan tech stack yang tepat, sebuah fitur kompleks bisa diimplementasikan dengan relatif cepat. Dari initial commit hingga release pertama hanya membutuhkan sekitar 6 bulan, dan integrasi payment dilakukan dalam waktu sekitar 5 bulan setelahnya.

Pentingnya autentikasi sebagai fondasi membuat pengembangan fitur-fitur selanjutnya seperti payment dan personalized content menjadi lebih mudah diimplementasikan.

---

*Artikel ini ditulis berdasarkan analisis repository GitHub nicogulo/chamjo-app dan pengalaman tim dalam mengembangkan Chamjo Design.*
