# Portly — Design Document

**Tanggal:** 2026-07-22
**Status:** Disetujui, siap masuk perencanaan implementasi

---

## 1. Masalah

Mahasiswa, fresh graduate, freelancer, designer, dan programmer butuh portfolio online, tapi terhalang oleh:

- Tidak bisa coding — harus edit HTML/CSS sendiri.
- Tidak bisa desain — hasilnya berantakan.
- Template gratis terlihat pasaran, semua orang pakai yang sama.
- Website builder umum (Framer, Webflow) terlalu rumit, terlalu umum, dan berbayar.

**Portly adalah website builder yang hanya mengerjakan satu hal: portfolio.**

Karena ruang lingkupnya sempit, Portly bisa memberi hal yang tidak bisa diberikan builder umum: section yang sudah paham konsep portfolio (Projects punya tech stack dan link demo, Skills punya level, Experience punya rentang tanggal), dan tema yang sudah dirancang matang sehingga hasilnya bagus tanpa user perlu mengambil keputusan desain apa pun.

### Bukan tujuan (non-goals)

Batasan ini sengaja dibuat supaya produknya tidak melebar jadi builder umum:

- Bukan builder website umum — tidak ada halaman toko, blog engine, atau landing page generik.
- Tidak ada canvas bebas posisi (free-form absolute positioning). Portfolio adalah tumpukan section vertikal. Titik.
- Tidak ada editor CSS/JS mentah di MVP.
- Tidak ada kolaborasi multi-user pada satu portfolio.

---

## 2. Keputusan Teknis Inti

### 2.1 Arsitektur — Laravel + Inertia + React, satu repo

**Stack:** Laravel 12, Inertia 2, React 19, TypeScript, Tailwind CSS 4, MySQL/SQLite, Laravel Breeze (auth).

**Alasan:** Editor drag-and-drop butuh state client yang kaya (undo/redo, autosave, preview realtime) — itu wilayah React. Sisanya (auth, upload, penyimpanan, halaman publik) adalah CRUD biasa — itu wilayah Laravel. Inertia menyambungkan keduanya tanpa perlu membangun REST API, token auth, atau menangani CORS.

**Alternatif yang ditolak:** Laravel API + React SPA terpisah. Lebih fleksibel untuk mobile app di masa depan, tapi menambah dua deployment, auth berbasis token, dan CORS sejak hari pertama — untuk kebutuhan yang belum ada. Kalau nanti benar-benar butuh, controller Inertia bisa diubah jadi API controller tanpa menyentuh mesin editor sama sekali.

**Tiga permukaan aplikasi:**

| Route | Auth | Isi |
|---|---|---|
| `/dashboard` | ya | List portfolio milik user |
| `/editor/{portfolio}` | ya, + policy pemilik | Editor 3 panel, React ambil alih penuh |
| `/p/{slug}` | tidak | Portfolio publik |

### 2.2 Data model — satu dokumen JSON

Seluruh isi editor disimpan sebagai satu dokumen JSON di kolom `portfolios.document`.

```
users        id, name, email, password                      (Breeze)
portfolios   id, user_id, title, slug (unique, nullable),
             document (json), published_at (nullable),
             timestamps
media        id, user_id, path, mime, size, timestamps
snapshots    id, portfolio_id, document (json), created_at   (version history, Phase 7)
```

Bentuk dokumen:

```json
{
  "version": 1,
  "theme": "minimal",
  "meta": { "title": "Irfan — Fullstack Developer", "description": "..." },
  "sections": [
    {
      "id": "s_a1b2c3",
      "type": "about",
      "layout": "image-left",
      "visible": true,
      "data": { "name": "Irfan", "title": "Fullstack Developer", "bio": "..." }
    }
  ]
}
```

**Alasan memilih satu dokumen, bukan tabel `sections`:**

Insting pertama adalah membuat tabel `sections` dengan kolom `order`. Tapi begitu ada autosave, undo/redo, dan drag reorder, satu gerakan user berubah jadi banyak `UPDATE` pada banyak baris. Kalau sebagian gagal, database jadi tidak konsisten dan sulit dipulihkan.

Dengan satu dokumen JSON:

- Reorder = memindahkan elemen array.
- Autosave = satu `UPDATE` pada satu baris.
- Undo/redo = tumpukan (stack) dokumen di memori client.
- Version history = menyalin dokumen ke tabel `snapshots`.
- Duplicate portfolio = menyalin satu baris.

**Konsekuensi yang diterima:** tidak bisa query lintas section di level SQL (misal "berapa banyak user yang memakai section Testimonials"). Untuk kebutuhan analytics seperti itu nanti, jawabannya adalah job terjadwal yang membaca dokumen dan menulis ke tabel agregat — bukan menormalisasi struktur utama.

**Batas ukuran:** kolom `document` bertipe `json` (MySQL: ~1 GB). Isi teks portfolio tidak akan mendekati itu. Gambar **tidak pernah** disimpan di dalam dokumen — dokumen hanya menyimpan media ID/path, file-nya di storage.

**Field `version`:** dipakai untuk migrasi bentuk dokumen. Kalau suatu saat struktur berubah, fungsi migrasi menaikkan dokumen lama ke versi baru saat dibaca.

### 2.3 Mesin schema-driven — inti dari seluruh sistem

Ada 11 section, masing-masing punya beberapa field, dan setiap field butuh input di panel Properties. Dikerjakan manual, ini ratusan form dengan pola identik.

Solusinya: **satu section = satu file definisi.** Panel editor, menu Add Section, dan tampilan canvas semuanya diturunkan dari file itu.

```ts
// resources/js/sections/about.ts
export const aboutSection: SectionDefinition = {
  type: 'about',
  label: 'About',
  icon: UserIcon,
  layouts: ['image-left', 'centered', 'split'],
  defaults: { name: 'Your Name', title: 'Your Title', bio: '', photo: null },
  fields: [
    { key: 'name',  type: 'text',     label: 'Name' },
    { key: 'title', type: 'text',     label: 'Job Title' },
    { key: 'bio',   type: 'textarea', label: 'Description' },
    { key: 'photo', type: 'image',    label: 'Profile Picture' },
  ],
  render: AboutSection,
}
```

Semua definisi didaftarkan di satu registry (`resources/js/sections/index.ts`). Dari registry itu:

- **Menu "Add Section"** — hasil map atas registry.
- **Panel Properties** — form yang di-generate dari array `fields`; tiap `type` field punya satu komponen input (`text`, `textarea`, `image`, `select`, `color`, `list`, `number`, `url`, `toggle`).
- **Canvas** — memanggil `render` sesuai `type` section.

Nambah section ke-12 = menulis satu file dan mendaftarkannya. Nol perubahan pada kode editor.

**Field bertipe `list`** (dipakai Projects, Skills, Experience, dan lainnya) berisi definisi field anak, sehingga panel bisa menampilkan daftar item yang bisa ditambah, dihapus, dan diurutkan ulang — juga secara otomatis.

**Satu komponen render untuk tiga tempat.** Komponen `render` yang sama dipakai di canvas editor, di preview responsif, dan di halaman publik. WYSIWYG dijamin secara struktural: mustahil hasil akhir berbeda dari canvas, karena kodenya memang hanya satu.

### 2.4 Tema — CSS custom properties

Komponen section **dilarang** menulis warna, font, atau radius secara langsung. Semuanya lewat token:

```css
[data-pf-theme="minimal"] {
  --pf-bg: #ffffff;
  --pf-surface: #f7f7f8;
  --pf-text: #111111;
  --pf-muted: #6b7280;
  --pf-accent: #2563eb;
  --pf-radius: 12px;
  --pf-font-head: 'Inter', sans-serif;
  --pf-font-body: 'Inter', sans-serif;
  --pf-space: 1rem;
}
```

Ganti tema = ganti atribut `data-pf-theme` di elemen pembungkus. Seluruh halaman berubah seketika, tanpa render ulang React, tanpa percabangan `if (theme === ...)` tersebar di 11 section.

**Aturan ini ditegakkan sejak section pertama.** Kalau ditunda, 11 section harus dibongkar ulang belakangan.

Lima tema di v1: `minimal` (Apple-like), `modern` (Linear-like), `dark` (Vercel-like), `creative` (Figma-like), `brutalist` (tipografi tebal).

### 2.5 State editor

Satu store (Zustand) memegang dokumen sebagai satu-satunya sumber kebenaran.

```
document          — isi portfolio saat ini
selectedId        — section yang sedang dipilih
past / future     — tumpukan undo/redo (Phase 7)
dirty             — ada perubahan yang belum tersimpan
```

Semua perubahan lewat action (`addSection`, `updateSectionData`, `moveSection`, `removeSection`, `setTheme`, ...). Autosave: debounce 1.5 detik setelah perubahan terakhir, `PATCH` ke `/editor/{portfolio}` mengirim seluruh dokumen. Indikator status simpan ditampilkan di toolbar (`Saving…` / `Saved`).

**Penanganan gagal simpan:** kalau request gagal, `dirty` tetap `true`, toolbar menampilkan status gagal beserta tombol coba lagi, dan `beforeunload` memperingatkan sebelum user menutup tab. Dokumen di client tidak pernah dibuang karena kegagalan simpan.

### 2.6 Drag & drop

`@dnd-kit` (bukan SortableJS) — bekerja dengan model React, mendukung keyboard dan screen reader secara bawaan.

Dua konteks drag: **reorder section** di canvas/outline, dan **reorder item** di dalam field bertipe `list`.

### 2.7 Halaman publik

`/p/{slug}` adalah halaman Inertia yang me-render dokumen memakai komponen section yang sama. Hanya bisa diakses kalau `published_at` tidak null; kalau belum publish, tampil 404. Slug unik, dipilih user, divalidasi (huruf kecil, angka, tanda hubung), dengan daftar kata terlarang (`api`, `dashboard`, `editor`, `login`, dan sejenisnya).

---

## 3. Struktur Kode

```
app/
  Http/Controllers/  DashboardController, PortfolioController,
                     EditorController, PublicPortfolioController, MediaController
  Models/            User, Portfolio, Media, Snapshot
  Policies/          PortfolioPolicy
  Support/Document/  DocumentValidator, DocumentMigrator, DocumentDefaults

resources/js/
  pages/             Dashboard, Editor, PublicPortfolio     (halaman Inertia)
  editor/            EditorShell, Canvas, SectionOutline,
                     PropertiesPanel, Toolbar, AddSectionMenu
  editor/fields/     TextField, TextareaField, ImageField, SelectField,
                     ColorField, ListField, NumberField, UrlField, ToggleField
  sections/          index.ts (registry) + satu file per section
  sections/render/   AboutSection.tsx, ProjectsSection.tsx, ...
  store/             useEditorStore.ts
  themes/            themes.css, themes.ts
  types/             document.ts, section.ts
```

**Batasan ukuran:** kalau satu file lewat ~300 baris, itu tanda tanggung jawabnya terlalu banyak dan harus dipecah.

---

## 4. Penanganan Error

| Kondisi | Perilaku |
|---|---|
| Autosave gagal | `dirty` tetap true, toolbar tampilkan status gagal + tombol coba lagi, `beforeunload` memperingatkan |
| Dokumen rusak / tidak valid | `DocumentValidator` menolak saat simpan (422); saat baca, field yang tidak dikenal diabaikan dan default dipakai |
| Section `type` tidak dikenal saat render | Tampilkan placeholder "Unknown section" alih-alih membuat halaman blank |
| Upload melebihi batas | Ditolak di server (validasi) dan di client (cek sebelum kirim), pesan jelas |
| Akses portfolio milik orang lain | `PortfolioPolicy` → 403 |
| Slug bentrok | Validasi unique, pesan "sudah dipakai" |
| Buka `/p/{slug}` yang belum publish | 404 (bukan 403 — tidak membocorkan keberadaannya) |

---

## 5. Testing

**Backend (Pest):** policy portfolio (pemilik vs bukan pemilik), validasi dokumen, simpan/muat dokumen, aturan slug, halaman publik hanya tampil jika sudah publish, upload media (tipe & ukuran).

**Frontend (Vitest):** action store — add, remove, move, update, duplicate, hide; generator panel Properties menghasilkan input yang benar dari schema; migrasi dokumen antar `version`.

**End-to-end (Playwright, mulai Phase 3):** satu alur utama — daftar → buat portfolio → tambah section → edit isi → reorder → publish → buka halaman publik.

**Aturan yang ditegakkan:** setiap definisi section wajib punya test yang memastikan `defaults` lolos validasi dan setiap `field.key` benar-benar ada di `defaults`.

---

## 6. Phase

Setiap phase menghasilkan sesuatu yang bisa dibuka di browser dan dilihat jalan.

### Phase 0 — Fondasi
Laravel 12 + Breeze + Inertia + React + TS + Tailwind. Migration `portfolios`, `media`. Model, policy, seeder. Bisa daftar, login, lihat dashboard kosong.
**Selesai kalau:** login jalan, `php artisan test` hijau, `npm run build` berhasil.

### Phase 1 — Mesin Section
Tipe `SectionDefinition`, registry, token tema CSS, dan dua section pertama (About, Projects). Sebuah halaman me-render portfolio dari dokumen JSON yang di-seed. **Belum ada editor.**
**Selesai kalau:** mengubah JSON seeder mengubah halaman, dan mengganti `data-pf-theme` mengubah seluruh tampilan.
**Kenapa tanpa editor:** kalau mesin render-nya salah, lebih baik ketahuan saat masih 2 section daripada saat sudah 11.

### Phase 2 — Editor Inti
Dashboard (buat/rename/hapus portfolio), editor 3 panel, Add Section, drag reorder, autosave, dan aksi per-section: duplicate, hide, delete, move.
**Selesai kalau:** user bisa menyusun urutan section, refresh halaman, dan susunannya tetap.

### Phase 3 — Panel Properties
Sembilan komponen field, generator form dari schema, edit realtime, upload media (`MediaController` + `ImageField`).
**Selesai kalau:** seluruh isi About dan Projects bisa diubah dari panel kanan tanpa menyentuh JSON, termasuk gambar.

### Phase 4 — Tema & Preview
Lima tema, pemilih tema di toolbar, layout variant per section, preview desktop/tablet/mobile.
**Selesai kalau:** ganti tema mengubah seluruh halaman seketika, dan ketiga ukuran preview tampil benar.

### Phase 5 — Sembilan Section Sisanya
Experience, Education, Skills, Gallery, Contact, Timeline, Testimonials, Awards, Certificate.
**Selesai kalau:** semua 11 section bisa ditambah, diedit, dan tampil benar di kelima tema.
**Kenapa setelah tema:** supaya 9 section lahir sudah theme-aware, bukan dibongkar ulang.

### Phase 6 — Publish
Pemilihan slug + validasi, tombol publish/unpublish, halaman publik `/p/{slug}`, meta SEO dan Open Graph, tombol salin link.
**Selesai kalau:** portfolio bisa dibuka di jendela penyamaran dan tampil identik dengan canvas.

### Phase 7 — Polish & Export
Undo/redo, version history (`snapshots`), export ZIP (HTML + CSS + assets), landing page, template starter.
**Selesai kalau:** ZIP hasil export bisa dibuka langsung di browser tanpa server dan tampil identik dengan halaman publik.

---

## 7. Ditunda (bukan sekarang)

Custom domain, analytics pengunjung, form kontak yang benar-benar mengirim email, download PDF resume, blog, multi-language, custom CSS/JS, template marketplace, custom font upload, kolaborasi.

Semuanya masuk akal — tapi tidak satu pun dibutuhkan untuk membuktikan bahwa Portly bekerja.
