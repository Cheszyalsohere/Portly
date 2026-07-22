# Portly — Design Document

**Tanggal:** 2026-07-22
**Revisi:** 2
**Status:** Disetujui, siap masuk perencanaan implementasi

---

## 1. Masalah

Mahasiswa, fresh graduate, freelancer, designer, dan programmer butuh portfolio online, tapi terhalang oleh:

- Tidak bisa coding — harus edit HTML/CSS sendiri.
- Tidak bisa desain — hasilnya berantakan.
- Template gratis terlihat pasaran, semua orang pakai yang sama.
- Website builder umum (Framer, Webflow) terlalu rumit, terlalu umum, dan berbayar.

**Portly adalah website builder yang hanya mengerjakan satu hal: portfolio.**

Karena ruang lingkupnya sempit, Portly bisa memberi hal yang tidak bisa diberikan builder umum: section yang sudah paham konsep portfolio (Projects punya tech stack dan link demo, Skills punya level, Experience punya rentang tanggal), dan tema yang sudah dirancang matang sehingga hasilnya bagus tanpa user perlu mengambil satu pun keputusan desain.

### Bukan tujuan (non-goals)

Batasan ini sengaja dibuat supaya produknya tidak melebar jadi builder umum:

- Bukan builder website umum — tidak ada halaman toko, blog engine, atau landing page generik.
- **Tidak ada canvas bebas posisi.** Portfolio adalah tumpukan section vertikal. Ini yang membuat drag-and-drop sederhana dan hasilnya selalu rapi.
- **Tidak ada shell layout alternatif** (sidebar, dua kolom) di v1. Variasi tampilan datang dari *section variant* (§2.5), bukan dari mengubah kerangka halaman.
- Tidak ada editor CSS/JS mentah.
- Tidak ada kolaborasi multi-user pada satu portfolio (tapi konflik antar-tab tetap ditangani — §2.6).

---

## 2. Keputusan Teknis Inti

### 2.1 Arsitektur — Laravel + Inertia + React, satu repo

**Stack:** Laravel 12, Inertia 2 (+ SSR mulai Phase 6), React 19, TypeScript, Tailwind CSS 4, MySQL/SQLite, Laravel Breeze, `@dnd-kit`, Zustand.

**Alasan:** Editor drag-and-drop butuh state client yang kaya (undo/redo, autosave, preview realtime) — wilayah React. Sisanya (auth, upload, penyimpanan, halaman publik) adalah CRUD biasa — wilayah Laravel. Inertia menyambungkan keduanya tanpa perlu membangun REST API, token auth, atau menangani CORS.

**Alternatif yang ditolak:** Laravel API + React SPA terpisah. Lebih fleksibel untuk mobile app di masa depan, tapi menambah dua deployment, auth berbasis token, dan CORS sejak hari pertama — untuk kebutuhan yang belum ada. Kalau nanti dibutuhkan, controller Inertia bisa diubah jadi API controller tanpa menyentuh mesin editor.

**Tiga permukaan aplikasi:**

| Route | Auth | Isi |
|---|---|---|
| `/dashboard` | ya | List portfolio milik user |
| `/editor/{portfolio}` | ya + policy pemilik | Editor 3 panel, React ambil alih penuh |
| `/p/{slug}` | tidak | Portfolio publik, render dari dokumen **published** |

### 2.2 Data model — satu dokumen JSON, draft terpisah dari published

```
users        id, name, email, password                            (Breeze)

portfolios   id, user_id, title,
             slug (unique, nullable),
             document (json)                — DRAFT, yang diedit
             revision (unsigned int, 0)     — naik tiap draft tersimpan
             published_document (json, null) — SNAPSHOT saat publish
             published_revision (int, null)  — revision saat publish
             published_at (timestamp, null)
             timestamps

media        id, user_id, path, mime, size, width, height, timestamps

snapshots    id, portfolio_id, document (json), revision, label, created_at
```

Bentuk dokumen:

```json
{
  "version": 1,
  "theme": "minimal",
  "template": "developer",
  "meta": { "title": "Irfan — Fullstack Developer", "description": "..." },
  "sections": [
    {
      "id": "s_a1b2c3",
      "type": "about",
      "variant": "image-left",
      "visible": true,
      "data": { "name": "Irfan", "title": "Fullstack Developer", "bio": "..." }
    }
  ]
}
```

**Kenapa satu dokumen, bukan tabel `sections`:** insting pertama adalah tabel `sections` dengan kolom `order`. Tapi dengan autosave, undo/redo, dan drag reorder, satu gerakan user berubah jadi banyak `UPDATE` pada banyak baris; kalau sebagian gagal, database jadi tidak konsisten. Dengan satu dokumen: reorder = memindahkan elemen array, autosave = satu `UPDATE`, undo/redo = tumpukan dokumen di memori, version history = menyalin dokumen, duplicate portfolio = menyalin satu baris.

**Konsekuensi yang diterima:** tidak bisa query lintas section di level SQL. Untuk analytics semacam itu nanti, jawabannya adalah job terjadwal yang membaca dokumen dan menulis ke tabel agregat — bukan menormalisasi struktur utama.

**Gambar tidak pernah masuk ke dalam dokumen.** Dokumen hanya menyimpan media ID/path; file-nya di storage. Kalau tidak, dokumen membengkak dan autosave jadi lambat.

**Field `version`** dipakai untuk migrasi bentuk dokumen. Kalau struktur berubah, `DocumentMigrator` menaikkan dokumen lama ke versi baru saat dibaca.

### 2.3 Draft vs Published — publish bersifat immutable

Halaman publik **tidak pernah** merender `document`. Ia merender `published_document`, yaitu salinan beku yang dibuat saat user menekan Publish.

```
Edit → document berubah, revision naik      (publik tidak berubah)
Publish → published_document = document
          published_revision = revision      (publik ikut berubah)
```

**Kenapa penting:** tanpa ini, portfolio orang rusak di depan umum setiap kali mereka mengedit. User yang sedang menata ulang section sambil dilihat recruiter adalah skenario yang harus mustahil terjadi.

**Perilaku:**

- Tombol berubah jadi **"Publish Update"** dan indikator "ada perubahan belum dipublikasikan" tampil kalau `revision > published_revision`.
- **Unpublish** menyetel `published_at = null`. `published_document` tetap disimpan supaya publish ulang instan.
- Membuka `/p/{slug}` yang `published_at`-nya null → **404** (bukan 403 — tidak membocorkan keberadaannya).

### 2.4 Mesin schema-driven — inti dari seluruh sistem

Ada 11 section, masing-masing punya beberapa field, dan setiap field butuh input di panel Properties. Dikerjakan manual, ini ratusan form dengan pola identik.

Solusinya: **satu section = satu file definisi.** Menu Add Section, panel Properties, dan tampilan canvas semuanya diturunkan dari file itu.

```ts
// resources/js/sections/about.ts
export const aboutSection: SectionDefinition = {
  type: 'about',
  label: 'About',
  icon: UserIcon,

  defaults: { name: 'Your Name', title: 'Your Title', bio: '', photo: null },

  fields: [
    { key: 'name',  type: 'text',     label: 'Name' },
    { key: 'title', type: 'text',     label: 'Job Title' },
    { key: 'bio',   type: 'textarea', label: 'Description' },
    { key: 'photo', type: 'image',    label: 'Profile Picture' },
  ],

  variants: {
    'image-left': { label: 'Image Left', render: AboutImageLeft },
    'centered':   { label: 'Centered',   render: AboutCentered },
    'big-hero':   { label: 'Big Hero',   render: AboutBigHero },
    'split':      { label: 'Split',      render: AboutSplit },
  },
  defaultVariant: 'image-left',
}
```

Semua definisi didaftarkan di satu registry (`resources/js/sections/index.ts`). Dari registry itu:

- **Menu "Add Section"** — hasil map atas registry.
- **Panel Properties** — form yang di-generate dari array `fields`.
- **Pemilih variant** — hasil map atas `variants`.
- **Canvas** — memanggil `variants[section.variant].render`.

Nambah section ke-12 = menulis satu file dan mendaftarkannya. Nol perubahan pada kode editor.

**Tipe field:** `text`, `textarea`, `image`, `select`, `color`, `number`, `url`, `toggle`, `list`. Field `list` (dipakai Projects, Skills, Experience, dan lainnya) berisi definisi field anak, sehingga panel bisa menampilkan daftar item yang bisa ditambah, dihapus, dan diurutkan ulang — juga secara otomatis.

**Satu komponen render untuk tiga tempat.** Komponen `render` yang sama dipakai di canvas editor, di preview responsif, dan di halaman publik. WYSIWYG dijamin secara struktural: mustahil hasil akhir berbeda dari canvas, karena kodenya memang hanya satu.

### 2.5 Section variant — variasi visual termurah yang ada

Variant adalah cara utama Portly membuat dua portfolio terasa sangat berbeda tanpa mengubah arsitektur apa pun.

> **Aturan yang mengikat: semua variant dari satu section wajib berbagi bentuk `data` dan daftar `fields` yang sama persis. Sebuah variant boleh mengabaikan field, tapi tidak boleh menuntut field baru.**

Ini aturan yang membuat variant murah. Konsekuensinya: ganti variant tidak pernah menghilangkan isi yang sudah ditulis user, dan panel Properties tidak perlu berubah sama sekali. Contoh — Skills variant `bar` memakai field `level`, variant `pill` mengabaikannya; user bisa bolak-balik tanpa kehilangan apa pun.

Alokasi variant di v1 sengaja timpang — section yang paling dilihat orang dapat lebih banyak:

| Section | Variant |
|---|---|
| About | image-left, centered, big-hero, split |
| Projects | grid, cards, timeline, minimal-list |
| Skills | bar, pill, grouped |
| Gallery | masonry, grid, carousel |
| Experience | timeline, list |
| Education | timeline, list |
| Timeline | vertical, alternating |
| Testimonials | cards, quote-large |
| Contact | centered, split |
| Awards | list, cards |
| Certificate | list, cards |

Total 28 komponen render. Menambah variant belakangan = menambah satu entri di file definisi.

### 2.6 Autosave, revision, dan konflik

**Optimistic concurrency.** Setiap penyimpanan draft menaikkan `portfolios.revision`. Client mengirim `base_revision` bersama dokumen:

```
PATCH /editor/{portfolio}   { document, base_revision: 20 }

base_revision == revision  →  200, simpan, revision jadi 21
base_revision != revision  →  409, kirim balik dokumen + revision milik server
```

Tanpa ini, user yang membuka editor di dua tab akan saling menimpa perubahan tanpa sadar.

**Penanganan 409:** editor menampilkan banner konflik dengan dua pilihan eksplisit — **"Muat versi terbaru"** (buang perubahan lokal) atau **"Timpa dengan versi saya"** (kirim ulang memakai revision milik server). Tidak ada auto-merge; menebak niat user pada konflik dokumen lebih berbahaya daripada bertanya.

**Status simpan** adalah state machine yang terlihat di toolbar, bukan sekadar debounce:

| Status | Kapan |
|---|---|
| `idle` | Tidak ada perubahan belum tersimpan |
| `saving` | Request sedang berjalan |
| `saved` | Sukses (tampil sebentar, lalu kembali ke `idle`) |
| `offline` | `navigator.onLine` false, atau request gagal karena jaringan |
| `retrying` | Percobaan ulang dengan backoff 2s → 4s → 8s → 16s (maks 5×) |
| `conflict` | Server balas 409 — menunggu keputusan user |
| `error` | Gagal validasi (4xx selain 409) — tampilkan pesan, jangan retry |

Debounce 1,5 detik setelah perubahan terakhir. Dokumen di client **tidak pernah** dibuang karena kegagalan simpan; `beforeunload` memperingatkan selama masih ada perubahan belum tersimpan.

### 2.7 Tema — token, bukan CSS bebas

Tema mengubah lebih dari warna: jarak, bentuk, bayangan, hierarki tipografi, dan gerak. Tapi tema **tidak boleh** menulis CSS sembarangan.

**Kenapa dibatasi:** 5 tema × 11 section × 28 variant adalah ruang kombinasi yang terlalu besar untuk diuji manual. Kalau tema bebas menyasar apa saja, setiap tema baru berisiko merusak section lama, dan tidak ada yang akan tahu sampai user mengeluh.

**Kontraknya dua lapis.**

**Lapis 1 — token.** Komponen section dilarang menulis nilai warna/font/radius secara langsung; semuanya lewat custom property:

```css
[data-pf-theme="minimal"] {
  /* Warna */
  --pf-bg: #ffffff;         --pf-surface: #f7f7f8;
  --pf-text: #111111;       --pf-muted: #6b7280;
  --pf-accent: #2563eb;     --pf-accent-contrast: #ffffff;
  --pf-border: #e5e7eb;

  /* Tipografi */
  --pf-font-head: 'Inter', sans-serif;
  --pf-font-body: 'Inter', sans-serif;
  --pf-scale: 1.25;         /* rasio hierarki heading */
  --pf-weight-head: 600;
  --pf-tracking-head: -0.02em;
  --pf-leading: 1.6;

  /* Bentuk */
  --pf-radius: 12px;        --pf-radius-sm: 8px;
  --pf-border-width: 1px;
  --pf-shadow: 0 1px 3px rgb(0 0 0 / 0.08);

  /* Ruang */
  --pf-space: 1rem;         --pf-section-py: 6rem;
  --pf-gap: 1.5rem;         --pf-container: 72rem;

  /* Gerak */
  --pf-duration: 200ms;     --pf-ease: cubic-bezier(.4,0,.2,1);
}
```

**Lapis 2 — theme hooks.** Sebagian karakter tema tidak bisa dinyatakan sebagai token (brutalist butuh bayangan keras dan border tebal; creative butuh kartu ber-gradient). Untuk itu, tema boleh menulis CSS — tapi **hanya** menyasar daftar class yang sudah didokumentasikan:

```
.pf-card   .pf-heading   .pf-subheading   .pf-body
.pf-button .pf-media     .pf-divider      .pf-tag     .pf-meter
```

Setiap komponen section wajib memakai class-class ini. Tema **tidak boleh** menyasar class milik section tertentu (`.pf-projects-grid` dan sejenisnya). Dengan aturan ini, brutalist bisa benar-benar terasa brutal tanpa punya kemampuan merusak section Timeline.

Ganti tema = mengganti atribut `data-pf-theme` di elemen pembungkus. Seluruh halaman berubah seketika, tanpa render ulang React, tanpa percabangan `if (theme === ...)` tersebar di 11 section. **Aturan ini ditegakkan sejak section pertama** — kalau ditunda, 11 section harus dibongkar ulang.

Lima tema v1: `minimal` (Apple-like), `modern` (Linear-like), `dark` (Vercel-like), `creative` (Figma-like), `brutalist` (tipografi tebal).

### 2.8 Template ≠ Theme

Dua konsep yang sengaja dipisah:

| | Menentukan | Bentuknya |
|---|---|---|
| **Template** | Section apa saja, urutannya, variant awal, dan isi contoh | Preset JSON |
| **Theme** | Warna, font, radius, spacing, gerak | Token CSS |

Template hanyalah dokumen awal — `resources/js/templates/developer.ts` mengembalikan `sections[]`. Menerapkan template ke portfolio yang sudah ada akan mengganti seluruh susunan section, jadi butuh konfirmasi eksplisit.

Template v1: `developer`, `designer`, `student`, `freelancer`, dan `blank`.

Karena template cuma data, menambah template baru tidak menyentuh kode sama sekali.

### 2.9 State editor

Satu store (Zustand) memegang dokumen sebagai satu-satunya sumber kebenaran.

```
document      selectedId      saveStatus      revision
past[]        future[]        dirty
```

Semua perubahan lewat action (`addSection`, `updateSectionData`, `setVariant`, `moveSection`, `removeSection`, `duplicateSection`, `toggleVisible`, `setTheme`, `applyTemplate`). Tidak ada komponen yang boleh memutasi dokumen secara langsung — ini yang membuat undo/redo dan autosave bisa dipasang di satu tempat.

### 2.10 Drag & drop

`@dnd-kit` (bukan SortableJS) — bekerja dengan model React, mendukung keyboard dan screen reader secara bawaan. Dua konteks drag: reorder section di canvas/outline, dan reorder item di dalam field bertipe `list`.

### 2.11 Halaman publik & SSR

`/p/{slug}` merender `published_document` memakai komponen section yang sama, lewat **Inertia SSR**.

SSR bukan sekadar optimasi: portfolio yang tidak bisa di-index Google kehilangan sebagian besar alasan keberadaannya. SSR juga yang membuat export statis (§2.12) mungkin — HTML-nya sudah jadi di server.

Slug dipilih user, divalidasi (huruf kecil, angka, tanda hubung), unik, dengan daftar kata terlarang: `api`, `app`, `dashboard`, `editor`, `login`, `register`, `logout`, `admin`, `storage`, `assets`, `p`, `u`.

### 2.12 Export statis

Klik Export menghasilkan ZIP:

```
index.html      — hasil SSR dari published_document
style.css       — Tailwind terkompilasi + token tema + theme hooks
assets/         — seluruh media, URL sudah ditulis ulang jadi relatif
favicon.ico     — dari media user, atau digenerate dari inisial nama
robots.txt      manifest.json      sitemap.xml
```

Hasilnya harus bisa dibuka langsung dengan klik dua kali pada `index.html`, tanpa server, dan bisa di-drag ke Netlify atau GitHub Pages tanpa konfigurasi apa pun.

Prosesnya memakai ulang jalur SSR yang sama dengan halaman publik. Dijalankan sinkron dulu; kalau ternyata lambat, dipindah ke queue tanpa mengubah logikanya.

Catatan jujur: `sitemap.xml` untuk situs satu halaman nyaris tidak berguna. Tetap dibuat karena murah, tapi jangan berharap banyak.

---

## 3. Struktur Kode

```
app/
  Http/Controllers/  DashboardController, PortfolioController,
                     EditorController, PublishController,
                     PublicPortfolioController, MediaController, ExportController
  Models/            User, Portfolio, Media, Snapshot
  Policies/          PortfolioPolicy
  Support/Document/  DocumentValidator, DocumentMigrator, DocumentDefaults
  Support/Export/    ExportBuilder, AssetCollector, ZipWriter

resources/js/
  pages/             Dashboard, Editor, PublicPortfolio
  editor/            EditorShell, Canvas, SectionOutline, PropertiesPanel,
                     Toolbar, AddSectionMenu, VariantPicker, ThemePicker,
                     SaveStatus, ConflictBanner, DevicePreview
  editor/fields/     TextField, TextareaField, ImageField, SelectField,
                     ColorField, NumberField, UrlField, ToggleField, ListField
  sections/          index.ts (registry) + satu file definisi per section
  sections/render/   about/, projects/, skills/, ...  (satu file per variant)
  templates/         developer.ts, designer.ts, student.ts, freelancer.ts, blank.ts
  store/             useEditorStore.ts, useAutosave.ts
  themes/            themes.css, themes.ts
  types/             document.ts, section.ts
```

**Batasan ukuran:** kalau satu file lewat ~300 baris, itu tanda tanggung jawabnya terlalu banyak dan harus dipecah.

---

## 4. Penanganan Error

| Kondisi | Perilaku |
|---|---|
| Autosave gagal (jaringan) | Status `offline` → `retrying` dengan backoff; dokumen lokal dipertahankan |
| Autosave gagal (validasi) | Status `error` + pesan; tidak di-retry |
| `base_revision` tidak cocok | 409 → banner konflik, user pilih muat ulang atau timpa |
| Dokumen tidak valid saat simpan | `DocumentValidator` menolak (422) |
| Dokumen lama saat baca | `DocumentMigrator` menaikkan `version`; field tak dikenal diabaikan, default dipakai |
| `type` section tidak dikenal | Placeholder "Unknown section", bukan halaman blank |
| `variant` tidak dikenal | Jatuh ke `defaultVariant` |
| Upload melebihi batas / tipe salah | Ditolak di server dan dicek di client, pesan jelas |
| Akses portfolio milik orang lain | `PortfolioPolicy` → 403 |
| Slug bentrok atau kata terlarang | Validasi, pesan jelas |
| `/p/{slug}` belum publish | 404 |
| Export gagal di tengah jalan | ZIP parsial tidak pernah dikirim; pesan error, file sementara dibersihkan |

---

## 5. Testing

**Backend (Pest)**
Policy portfolio (pemilik vs bukan pemilik) · validasi dokumen · **konflik revision: dua PATCH dengan `base_revision` sama, yang kedua harus 409** · publish menyalin document ke published_document · edit setelah publish tidak mengubah halaman publik · unpublish → 404 · aturan slug termasuk kata terlarang · upload media (tipe & ukuran) · isi ZIP hasil export.

**Frontend (Vitest)**
Action store — add, remove, move, update, duplicate, hide, setVariant, applyTemplate · **ganti variant mempertahankan seluruh `data`** · generator panel Properties menghasilkan input yang benar dari schema · transisi state machine autosave · migrasi dokumen antar `version`.

**End-to-end (Playwright, mulai Phase 3)**
Satu alur utama: daftar → buat portfolio → tambah section → edit isi → ganti variant → reorder → publish → buka halaman publik di sesi anonim.

**Aturan yang ditegakkan otomatis:** satu test menyapu seluruh registry dan memastikan, untuk setiap section — `defaults` lolos validasi, setiap `field.key` ada di `defaults`, `defaultVariant` ada di `variants`, dan setiap variant bisa dirender memakai `defaults` tanpa error.

---

## 6. Phase

Setiap phase menghasilkan sesuatu yang bisa dibuka di browser dan dilihat jalan.

### Phase 0 — Fondasi
Laravel 12 + Breeze + Inertia + React + TS + Tailwind. Migration lengkap (termasuk `revision`, `published_document`, `published_revision` sejak awal — kolom ini murah sekarang, mahal kalau ditambal belakangan). Model, policy, `.gitattributes`.
**Selesai kalau:** login jalan, `php artisan test` hijau, `npm run build` berhasil.

### Phase 1 — Mesin Section
Tipe `SectionDefinition`, registry, kontrak token tema + theme hooks, dan dua section pertama (About, Projects) beserta variant-nya. Sebuah halaman merender portfolio dari dokumen JSON hasil seeder. **Belum ada editor.**
**Selesai kalau:** mengubah JSON seeder mengubah halaman, ganti `variant` mengubah tata letak, ganti `data-pf-theme` mengubah seluruh tampilan.
**Kenapa tanpa editor:** kalau mesin render-nya salah, lebih baik ketahuan saat masih 2 section daripada saat sudah 11.

### Phase 2 — Editor Inti
Dashboard, editor 3 panel, Add Section, drag reorder, aksi per-section (duplicate, hide, delete), autosave dengan state machine lengkap, revision + banner konflik.
**Selesai kalau:** buka editor di dua tab, edit dua-duanya, tab kedua dapat banner konflik — bukan diam-diam menimpa.

### Phase 3 — Panel Properties
Sembilan komponen field, generator form dari schema, edit realtime, pemilih variant, upload media.
**Selesai kalau:** seluruh isi About dan Projects bisa diubah dari panel kanan tanpa menyentuh JSON, dan ganti variant tidak menghilangkan apa pun.

### Phase 4 — Tema & Preview
Lima tema dengan token penuh + theme hooks, pemilih tema, preview desktop/tablet/mobile.
**Selesai kalau:** kelima tema terasa benar-benar berbeda — bukan cuma beda warna — dan ketiga ukuran preview tampil benar.

### Phase 5 — Sembilan Section Sisanya
Experience, Education, Skills, Gallery, Contact, Timeline, Testimonials, Awards, Certificate, lengkap dengan variant masing-masing.
**Selesai kalau:** test penyapu registry hijau untuk seluruh 11 section × seluruh variant × 5 tema.
**Kenapa setelah tema:** supaya 9 section lahir sudah theme-aware, bukan dibongkar ulang.

### Phase 6 — Publish & Halaman Publik
Slug + validasi, Publish / Publish Update / Unpublish, Inertia SSR, halaman publik, meta SEO + Open Graph, tombol salin link.
**Selesai kalau:** portfolio tampil di jendela penyamaran identik dengan canvas, dan mengedit draft setelahnya **tidak** mengubah halaman publik sampai Publish Update ditekan.

### Phase 7 — Template, Undo/Redo, History
Lima template, undo/redo, version history via `snapshots`, restore ke versi lama.
**Selesai kalau:** buat portfolio dari template `developer` langsung dapat susunan section terisi, dan Ctrl+Z membatalkan perubahan apa pun termasuk reorder.

### Phase 8 — Export & Landing
Export ZIP lengkap, landing page marketing.
**Selesai kalau:** ZIP di-extract, `index.html` diklik dua kali, tampil identik dengan halaman publik tanpa server apa pun.

---

## 7. Ditunda (bukan sekarang)

Shell layout sidebar · custom domain · analytics pengunjung · form kontak yang benar-benar mengirim email · download PDF resume · blog · multi-language · custom CSS/JS · template marketplace · upload custom font · kolaborasi realtime.

Semuanya masuk akal — tapi tidak satu pun dibutuhkan untuk membuktikan bahwa Portly bekerja.
