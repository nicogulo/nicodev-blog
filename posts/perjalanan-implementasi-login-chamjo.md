---
title: Perjalanan Implementasi Fitur Login di Chamjo Design
date: 2026-02-21
excerpt: Bagaimana Chamjo mengimplementasikan sistem autentikasi dengan Supabase dan transformasi signifikan pada landing page.
---

## Memilih Supabase sebagai Auth Provider

Keputusan untuk menggunakan **Supabase** sebagai authentication provider bukan tanpa alasan. Supabase menawarkan beberapa keuntungan yang sesuai dengan kebutuhan Chamjo:

1. **Open Source** - Bisa di-host sendiri jika diperlukan
2. **Built-in Auth** - Tidak perlu membangun sistem auth dari nol
3. **Social Login** - Mudah integrasi dengan Google, GitHub, dan provider lainnya
4. **Real-time Database** - Bonus fitur yang bisa dimanfaatkan untuk fitur lain di kemudian hari

Implementasi auth menggunakan pendekatan SSR (Server-Side Rendering) untuk keamanan yang lebih baik. Pendekatan ini sangat cocok dengan Next.js App Router yang digunakan Chamjo.

## Login dengan Google - Pilihan yang Strategis

Chamjo memilih **Google Sign-In** sebagai metode login utama. Pilihan ini didasarkan pada beberapa pertimbangan:

- **User Experience** - Mayoritas pengguna sudah memiliki akun Google, sehingga tidak perlu membuat akun baru
- **Kepercayaan** - Google adalah provider OAuth yang sudah dikenal dan dipercaya
- **Implementasi Cepat** - Supabase sudah menyediakan abstraction yang memudahkan integrasi Google OAuth

Modal login dirancang dengan pendekatan **mobile-first**. Untuk tampilan mobile, digunakan Bottom Sheet yang lebih mudah dijangkau dengan ibu jari. Sedangkan untuk desktop, ditampilkan dalam bentuk Modal dialog yang familiar.

## Transformasi Landing Page

Salah satu perubahan paling signifikan adalah bagaimana landing page bertransformasi berdasarkan status autentikasi pengguna.

### Sebelum Login (Guest User)

Landing page menampilkan berbagai section untuk mengenalkan Chamjo:
- **Hero Section** - Value proposition utama Chamjo
- **Content Section** - Penjelasan fitur-fitur platform
- **Trusted Section** - Social proof dari pengguna
- **Benefit Section** - Keuntungan menggunakan Chamjo
- **Benchmark Section** - Perbandingan dengan kompetitor
- **FAQ Section** - Pertanyaan yang sering diajukan
- **CTA Section** - Call to action untuk mendorong pendaftaran

### Setelah Login (Authenticated User)

Pengguna yang sudah login akan langsung di-redirect ke halaman `/browse` yang berisi konten utama Chamjo. Ini memberikan pengalaman yang seamless - pengguna tidak perlu melihat landing page lagi setelah mereka menjadi user terdaftar.

Halaman `/browse` sendiri diproteksi dengan baik. Jika pengguna yang belum login mencoba mengaksesnya, mereka akan di-redirect kembali ke landing page.

## Timeline Perkembangan

| Tanggal | Milestone |
|---------|-----------|
| Mei 2024 | Implementasi konfigurasi auth dan custom hooks |
| Mei 2024 | Komponen ModalLogin dengan Google Sign-In |
| November 2024 | Release pertama dengan fitur login yang stabil |
| 2025 | Berbagai improvement dan stabilisasi |

## Lessons Learned

### 1. Autentikasi Sebagai Fondasi

Memulai dengan auth sejak awal membuat arsitektur lebih clean. Tidak perlu retrofit auth ke sistem yang sudah kompleks. Setiap fitur baru yang membutuhkan user context sudah siap dari awal.

### 2. SSR untuk Security

Menggunakan Supabase SSR client memberikan keamanan yang lebih baik karena token dikelola di server-side. Ini mencegah potensi serangan seperti token theft dari client-side storage.

### 3. UX-First Approach

Modal login yang responsif menunjukkan perhatian terhadap user experience. Bottom Sheet untuk mobile dan Modal untuk desktop adalah pilihan yang tepat untuk memberikan pengalaman terbaik di setiap device.

### 4. Redirect Strategy yang Tepat

Mengarahkan user yang sudah login langsung ke halaman konten (bukan landing page) memberikan pengalaman yang lebih personal dan menghemat waktu pengguna.

## Tech Stack untuk Autentikasi

- **Frontend Framework**: Next.js dengan App Router
- **Auth Provider**: Supabase Auth dengan SSR support
- **OAuth Provider**: Google Sign-In
- **State Management**: React Hooks dengan custom hooks pattern
- **Routing Protection**: Server-side redirect berdasarkan auth state

## Penutup

Implementasi fitur login di Chamjo menunjukkan bahwa dengan perencanaan yang matang dan pilihan tech stack yang tepat, sebuah fitur fundamental seperti autentikasi bisa diimplementasikan dengan relatif cepat dan stabil.

Kunci utamanya adalah memilih provider yang sudah mature (Supabase), menggunakan pendekatan yang secure (SSR), dan memperhatikan user experience di setiap platform (responsive login modal).

Fitur ini menjadi fondasi yang memungkinkan Chamjo untuk berkembang dengan fitur-fitur lain yang membutuhkan user authentication di kemudian hari.

---

*Artikel ini ditulis berdasarkan analisis repository GitHub nicogulo/chamjo-app dan pengalaman tim dalam mengembangkan Chamjo Design.*
