# Portly Phase 0 — Fondasi: Implementation Plan

> **Untuk pengerjaan bertahap:** setiap step pakai checkbox (`- [ ]`). Kerjakan berurutan, jangan lompat — tiap task berakhir dengan commit yang berdiri sendiri.

**Goal:** Aplikasi Laravel + Inertia + React + TypeScript yang bisa daftar/login, punya seluruh skema database Portly (termasuk kolom yang baru dipakai di Phase 2 dan 6), policy kepemilikan, dan dua harness test (Pest + Vitest) yang hijau.

**Arsitektur:** Scaffold memakai React Starter Kit resmi Laravel, lalu digabungkan ke repo yang sudah ada (repo ini sudah punya `docs/` dan riwayat git). Tiga model — `Portfolio`, `Media`, `Snapshot` — dibuat lengkap sejak awal, termasuk kolom `revision`, `published_document`, dan `published_revision` yang baru terpakai di phase berikutnya. Belum ada editor, belum ada section, belum ada CRUD portfolio; Phase 0 hanya menyiapkan lantai.

**Tech Stack:** Laravel 13, Inertia, React, TypeScript, Tailwind CSS, SQLite, Pest, Vitest, Testing Library.

## Global Constraints

- **Jangan pernah** menambahkan trailer `Co-Authored-By` pada commit apa pun.
- **Jangan pernah** `git push` kecuali diminta secara eksplisit.
- Stage dengan path eksplisit — **jangan** `git add -A` atau `git add .`.
- Satu file maksimal ~300 baris. Lewat itu, pecah.
- Semua perintah dijalankan dari `D:\Project_Belajar\Portly` kecuali disebut lain.
- Shell adalah **PowerShell 5.1**: tidak ada `&&`, tidak ada `??`, tidak ada ternary. Untuk berantai: `A; if ($?) { B }`.
- Database dev memakai SQLite. Jangan tambahkan MySQL sebagai syarat.
- Tulis test **sebelum** implementasi. Jalankan dan pastikan gagal dulu, baru implementasi.

## Catatan Versi

Versi terpasang di mesin ini per 2026-07-22 (sudah diverifikasi, tidak perlu dicek ulang):

| | Versi |
|---|---|
| PHP | 8.4.12 |
| Composer | 2.8.12 |
| Node | 24.11.0 |
| npm | 11.6.1 |
| Laravel Installer | 5.22.0 |
| `laravel/framework` terbaru | 13.21.1 |

Ekstensi PHP yang dibutuhkan sudah aktif: `pdo_sqlite`, `zip`, `gd`, `fileinfo`, `mbstring`, `openssl`, `curl`, `intl`.

---

## Struktur File

| File | Tanggung jawab | Task |
|---|---|---|
| `.gitattributes` | Normalisasi akhir baris supaya git berhenti memperingatkan CRLF | 2 |
| `database/migrations/*_create_portfolios_table.php` | Tabel portfolios lengkap dengan kolom draft & published | 3 |
| `app/Models/Portfolio.php` | Model + cast JSON + relasi | 3 |
| `database/factories/PortfolioFactory.php` | Factory untuk test | 3 |
| `tests/Feature/PortfolioModelTest.php` | Perilaku model & default kolom | 3 |
| `database/migrations/*_create_media_table.php` | Tabel media | 4 |
| `app/Models/Media.php` | Model media | 4 |
| `database/factories/MediaFactory.php` | Factory media | 4 |
| `tests/Feature/MediaModelTest.php` | Perilaku model media | 4 |
| `database/migrations/*_create_snapshots_table.php` | Tabel version history | 5 |
| `app/Models/Snapshot.php` | Model snapshot | 5 |
| `database/factories/SnapshotFactory.php` | Factory snapshot | 5 |
| `tests/Feature/SnapshotModelTest.php` | Perilaku model snapshot | 5 |
| `app/Policies/PortfolioPolicy.php` | Aturan kepemilikan portfolio | 6 |
| `tests/Feature/PortfolioPolicyTest.php` | Pemilik boleh, orang lain tidak | 6 |
| `app/Http/Controllers/DashboardController.php` | Menyajikan daftar portfolio milik user | 7 |
| `resources/js/components/empty-state.tsx` | Komponen empty state yang bisa dipakai ulang | 7 |
| `tests/Feature/DashboardTest.php` | Guest ditolak, user lihat daftar kosong | 7 |
| `vitest.config.ts` | Konfigurasi test frontend | 8 |
| `resources/js/components/empty-state.test.tsx` | Membuktikan harness Vitest jalan | 8 |

---

## Task 1: Scaffold aplikasi ke dalam repo yang sudah ada

Repo ini sudah punya `.git/` dan `docs/`. `laravel new` tidak bisa menimpa direktori yang sudah berisi, jadi kita scaffold ke direktori sementara di sebelahnya, lalu pindahkan isinya.

**Files:**
- Create: seluruh kerangka Laravel di root repo
- Preserve: `.git/`, `docs/`

**Interfaces:**
- Produces: kerangka Laravel + Inertia + React + TS + Tailwind + auth; `php artisan`, `npm run build`, `php artisan test` bisa dijalankan.

- [ ] **Step 1: Pastikan repo bersih sebelum mulai**

```powershell
git -C D:\Project_Belajar\Portly status --short
```

Expected: tidak ada output sama sekali. Kalau ada perubahan belum di-commit, commit dulu sebelum lanjut.

- [ ] **Step 2: Scaffold ke direktori sementara**

Dijalankan dari `D:\Project_Belajar` (direktori induk), bukan dari dalam repo:

```powershell
Set-Location D:\Project_Belajar
laravel new portly-scaffold --react --pest --database=sqlite --npm --no-interaction
```

Arti tiap flag: `--react` memasang React Starter Kit (Inertia + React + TypeScript + Tailwind + auth), `--pest` memakai Pest sebagai test runner, `--database=sqlite` menghindari kebutuhan server database, `--npm` sekalian menjalankan `npm install` dan build pertama.

Expected: direktori `D:\Project_Belajar\portly-scaffold` berisi `artisan`, `composer.json`, `package.json`, `resources/js/`.

**Jangan lanjut sebelum ini benar:**

```powershell
Set-Location D:\Project_Belajar\portly-scaffold
php artisan --version
```

Expected: `Laravel Framework 13.x`. Kalau yang keluar `Invalid URI: Host is malformed`, baca bagian "Masalah yang Ditemui pada Step 2" di bawah — installer menulis `APP_URL` cacat, dan itu akan menjatuhkan build maupun test dengan pesan error yang menyesatkan.

- [ ] **Step 3: Pindahkan isi scaffold ke dalam repo**

```powershell
Get-ChildItem -Path D:\Project_Belajar\portly-scaffold -Force |
    Where-Object { $_.Name -ne '.git' } |
    Move-Item -Destination D:\Project_Belajar\Portly -Force
Remove-Item D:\Project_Belajar\portly-scaffold -Recurse -Force
Set-Location D:\Project_Belajar\Portly
```

Aman karena scaffold tidak punya `docs/` maupun `.git/`, jadi tidak ada yang bertabrakan.

- [ ] **Step 4: Pastikan `docs/` selamat dan kerangka Laravel ada**

```powershell
Test-Path D:\Project_Belajar\Portly\docs\portly-design.md
Test-Path D:\Project_Belajar\Portly\artisan
Test-Path D:\Project_Belajar\Portly\resources\js
```

Expected: `True` tiga kali. Kalau salah satu `False`, **berhenti** — jangan lanjut, jangan commit.

- [ ] **Step 5: Catat versi sebenarnya yang terpasang**

```powershell
php artisan --version
node -e "const p=require('./package.json'); console.log(JSON.stringify({...p.dependencies, ...p.devDependencies}, null, 2))"
```

Salin hasilnya ke bagian "Versi Terpasang" di bawah task ini. Ini bukan formalitas — task berikutnya mengasumsikan nama file dari starter kit, dan versi yang tercatat memudahkan menelusuri kalau ada yang tidak cocok.

- [ ] **Step 6: Verifikasi test bawaan hijau**

```powershell
php artisan test
```

Expected: seluruh test starter kit PASS. Kalau ada yang gagal di titik ini, itu masalah scaffold — selesaikan dulu, jangan ditumpuk.

- [ ] **Step 7: Verifikasi build frontend berhasil**

```powershell
npm run build
```

Expected: selesai tanpa error, direktori `public/build` terbentuk.

- [ ] **Step 8: Commit**

```powershell
git add .gitignore artisan composer.json composer.lock package.json package-lock.json vite.config.ts tsconfig.json phpunit.xml app bootstrap config database public resources routes storage tests
git commit -m @'
chore: scaffold Laravel React starter kit

Install Laravel 13 with the official React starter kit (Inertia, React,
TypeScript, Tailwind, authentication), Pest, and a SQLite database.
'@
```

Kalau ada file/direktori dari daftar di atas yang ternyata tidak ada, hapus namanya dari perintah `git add` — jangan ganti jadi `git add .`.

- [ ] **Step 9: Pastikan tidak ada yang tertinggal atau ikut terbawa**

```powershell
git status --short
```

Expected: kosong, **kecuali** file yang memang harus diabaikan. Kalau `.env`, `database/database.sqlite`, `node_modules/`, `vendor/`, atau `public/build/` muncul sebagai untracked, periksa `.gitignore` bawaan Laravel — semuanya seharusnya sudah tercakup.

### Versi Terpasang

Hasil Step 5, 2026-07-22:

| Paket | Versi |
|---|---|
| `laravel/framework` | v13.21.1 |
| `inertiajs/inertia-laravel` | v3.1.1 |
| `laravel/fortify` | v1.37.3 |
| `laravel/wayfinder` | v0.1.20 |
| `larastan/larastan` | v3.10.0 |
| `pestphp/pest` | v4.7.5 |
| `@inertiajs/react` | ^3.0.0 |
| `react` | ^19.2.0 |
| `typescript` | ^5.7.2 |
| `tailwindcss` | ^4.0.0 |
| `vite` | ^8.0.0 |
| `@vitejs/plugin-react` | ^5.2.0 |

Tiga hal yang berbeda dari dugaan awal dan berpengaruh ke phase berikutnya:

1. **Inertia 3, bukan 2.** Design doc sudah ditulis tanpa nomor versi, jadi tidak ada yang perlu diubah — tapi saat mencari dokumentasi, pastikan yang dibaca versi 3.
2. **Autentikasi memakai Laravel Fortify**, lengkap dengan 2FA dan passkey. Kita tidak menyentuhnya; cukup tahu bahwa route auth datang dari Fortify, bukan dari controller di `app/Http/Controllers/Auth`.
3. **Wayfinder ikut terpasang** dan menghasilkan definisi route ber-TypeScript saat build. Ini berguna nanti, tapi juga berarti `npm run build` akan gagal kalau `php artisan` sedang rusak — persis yang terjadi di bawah.

### Masalah yang Ditemui pada Step 2 (dan cara memperbaikinya)

Installer menulis `APP_URL` yang cacat ke `.env`:

```
APP_URL=http://localhost:8000:8000     ← port dobel, URI tidak valid
```

Akibatnya **setiap** perintah `php artisan` mati dengan `Invalid URI: Host is malformed`, yang lalu menjatuhkan `package:discover`, lalu `wayfinder:generate`, lalu `npm run build`. Gejalanya muncul jauh dari penyebabnya — error yang terlihat adalah build frontend gagal, padahal masalahnya satu baris di `.env`.

Perbaikannya:

```powershell
(Get-Content .env -Raw) -replace 'APP_URL=http://localhost:8000:8000', 'APP_URL=http://localhost:8000' |
    Set-Content .env -NoNewline -Encoding utf8
php artisan package:discover
npm run build
```

`.env.example` tidak terpengaruh — isinya sudah benar. Karena `.env` tidak masuk git, perbaikan ini harus diulang oleh siapa pun yang menjalankan `laravel new` lagi.

**Kalau `npm run build` gagal di masa depan, cek `php artisan --version` lebih dulu** sebelum menyalahkan konfigurasi Vite.

---

## Task 2: Normalisasi akhir baris

**Sebagian besar task ini ternyata tidak perlu dikerjakan.** Starter kit sudah membawa `.gitattributes` dengan baris yang penting:

```
* text=auto eol=lf
```

Itu sudah cukup — seluruh file teks disimpan di git memakai LF, dan git mendeteksi file biner secara otomatis tanpa perlu didaftarkan satu per satu. Peringatan `LF will be replaced by CRLF` yang muncul saat commit design doc memang langsung hilang begitu file ini ter-commit bersama scaffold di Task 1.

Yang tersisa hanya satu: dua file di `docs/` sudah ter-commit **sebelum** `.gitattributes` ada, jadi keduanya mungkin tersimpan dengan CRLF.

**Files:**
- Modify: catatan akhir baris pada `docs/portly-design.md`, `docs/plans/2026-07-22-phase-0-fondasi.md`

- [ ] **Step 1: Normalisasi file yang sudah ter-commit sebelumnya**

```powershell
git add --renormalize .
git status --short
```

Expected: `docs/portly-design.md` dan/atau file rencana muncul sebagai `M`. Kalau tidak ada yang muncul, berarti keduanya memang sudah LF — lanjut saja ke Task 3, tidak ada yang perlu di-commit.

- [ ] **Step 2: Commit bila ada perubahan**

```powershell
git commit -m @'
chore: renormalize line endings on docs committed before gitattributes
'@
```

---

## Task 3: Model `Portfolio` + migration + factory

Kolom `revision`, `published_document`, dan `published_revision` dibuat sekarang walaupun baru dipakai di Phase 2 dan Phase 6. Menambah kolom ke tabel kosong itu gratis; menambalnya setelah ada data pengguna itu mahal.

**Files:**
- Create: `database/migrations/2026_07_22_000001_create_portfolios_table.php`
- Create: `app/Models/Portfolio.php`
- Create: `database/factories/PortfolioFactory.php`
- Test: `tests/Feature/PortfolioModelTest.php`

**Interfaces:**
- Consumes: model `App\Models\User` dari starter kit.
- Produces:
  - `App\Models\Portfolio` dengan kolom `id, user_id, title, slug, document, revision, published_document, published_revision, published_at, created_at, updated_at`
  - Cast: `document` → `array`, `published_document` → `array`, `published_at` → `datetime`, `revision` → `integer`, `published_revision` → `integer`
  - Relasi: `Portfolio::user(): BelongsTo`
  - `Database\Factories\PortfolioFactory`

- [x] **Step 1: Pastikan Pest memuat ulang database tiap test**

**Sudah dikerjakan di Task 1** — ternyata installer meninggalkan `tests/Pest.php` dalam keadaan kosong (nol byte), efek lanjutan dari bug `APP_URL`. Isinya sekarang:

```php
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');
```

Kenapa ini penting dan kenapa tidak ketahuan dari test yang lulus: **test bawaan starter kit ditulis gaya PHPUnit class** — tiap kelas `extends Tests\TestCase` dan menulis `use RefreshDatabase;` sendiri, jadi mereka tidak butuh `Pest.php` sama sekali. Test yang akan kita tulis mulai sini ditulis **gaya Pest** (`it('...', function () {...})`), dan gaya itu bergantung penuh pada `Pest.php`. Dengan file kosong, seluruh test kita akan gagal dengan pesan yang jauh dari penyebabnya.

`phpunit.xml` bawaan starter kit sudah memakai SQLite `:memory:`, jadi test tidak pernah menyentuh database dev.

- [ ] **Step 2: Tulis test yang gagal**

Buat `tests/Feature/PortfolioModelTest.php`:

```php
<?php

use App\Models\Portfolio;
use App\Models\User;

it('casts document to an array', function () {
    $portfolio = Portfolio::factory()->create([
        'document' => ['version' => 1, 'theme' => 'minimal', 'sections' => []],
    ]);

    expect($portfolio->fresh()->document)
        ->toBe(['version' => 1, 'theme' => 'minimal', 'sections' => []]);
});

it('starts at revision zero', function () {
    expect(Portfolio::factory()->create()->revision)->toBe(0);
});

it('is unpublished by default', function () {
    $portfolio = Portfolio::factory()->create();

    expect($portfolio->published_at)->toBeNull()
        ->and($portfolio->published_document)->toBeNull()
        ->and($portfolio->published_revision)->toBeNull();
});

it('casts published_document to an array once published', function () {
    $document = ['version' => 1, 'theme' => 'dark', 'sections' => []];

    $portfolio = Portfolio::factory()->create([
        'published_document'  => $document,
        'published_revision'  => 3,
        'published_at'        => now(),
    ]);

    expect($portfolio->fresh()->published_document)->toBe($document)
        ->and($portfolio->fresh()->published_revision)->toBe(3);
});

it('belongs to a user', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($portfolio->user->id)->toBe($user->id);
});

it('allows a null slug so unpublished drafts do not need one', function () {
    expect(Portfolio::factory()->create(['slug' => null])->slug)->toBeNull();
});
```

- [ ] **Step 3: Jalankan test, pastikan GAGAL**

```powershell
php artisan test --filter=PortfolioModelTest
```

Expected: FAIL dengan `Class "App\Models\Portfolio" not found`.

- [ ] **Step 4: Buat migration**

Buat `database/migrations/2026_07_22_000001_create_portfolios_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->nullable()->unique();

            $table->json('document');
            $table->unsignedInteger('revision')->default(0);

            $table->json('published_document')->nullable();
            $table->unsignedInteger('published_revision')->nullable();
            $table->timestamp('published_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolios');
    }
};
```

- [ ] **Step 5: Buat model**

Buat `app/Models/Portfolio.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Portfolio extends Model
{
    /** @use HasFactory<\Database\Factories\PortfolioFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'document',
        'revision',
        'published_document',
        'published_revision',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'document'           => 'array',
            'published_document' => 'array',
            'revision'           => 'integer',
            'published_revision' => 'integer',
            'published_at'       => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 6: Buat factory**

Buat `database/factories/PortfolioFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Portfolio>
 */
class PortfolioFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'  => User::factory(),
            'title'    => fake()->words(2, true),
            'slug'     => null,
            'document' => [
                'version'  => 1,
                'theme'    => 'minimal',
                'template' => 'blank',
                'meta'     => ['title' => '', 'description' => ''],
                'sections' => [],
            ],
        ];
    }
}
```

- [ ] **Step 7: Jalankan test, pastikan LULUS**

```powershell
php artisan test --filter=PortfolioModelTest
```

Expected: 6 test PASS.

- [ ] **Step 8: Commit**

```powershell
git add app/Models/Portfolio.php database/factories/PortfolioFactory.php database/migrations tests/Feature/PortfolioModelTest.php tests/Pest.php
git commit -m @'
feat: add Portfolio model with draft and published document columns

Create the portfolios table with revision tracking and a published
snapshot separate from the editable draft, so later phases can add
optimistic concurrency and immutable publishing without a schema change.
'@
```

---

## Task 4: Model `Media` + migration + factory

**Files:**
- Create: `database/migrations/2026_07_22_000002_create_media_table.php`
- Create: `app/Models/Media.php`
- Create: `database/factories/MediaFactory.php`
- Test: `tests/Feature/MediaModelTest.php`

**Interfaces:**
- Produces:
  - `App\Models\Media` dengan kolom `id, user_id, path, mime, size, width, height, created_at, updated_at`
  - Cast: `size`, `width`, `height` → `integer`
  - Relasi: `Media::user(): BelongsTo`
  - `Database\Factories\MediaFactory`

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/Feature/MediaModelTest.php`:

```php
<?php

use App\Models\Media;
use App\Models\User;

it('belongs to a user', function () {
    $user  = User::factory()->create();
    $media = Media::factory()->for($user)->create();

    expect($media->user->id)->toBe($user->id);
});

it('stores dimensions as integers', function () {
    $media = Media::factory()->create([
        'width'  => 1200,
        'height' => 800,
        'size'   => 45_312,
    ]);

    expect($media->fresh()->width)->toBe(1200)
        ->and($media->fresh()->height)->toBe(800)
        ->and($media->fresh()->size)->toBe(45_312);
});

it('allows null dimensions for files that are not images', function () {
    $media = Media::factory()->create([
        'mime'   => 'application/pdf',
        'width'  => null,
        'height' => null,
    ]);

    expect($media->fresh()->width)->toBeNull()
        ->and($media->fresh()->height)->toBeNull();
});

it('is deleted when its owner is deleted', function () {
    $user  = User::factory()->create();
    $media = Media::factory()->for($user)->create();

    $user->delete();

    expect(Media::find($media->id))->toBeNull();
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```powershell
php artisan test --filter=MediaModelTest
```

Expected: FAIL dengan `Class "App\Models\Media" not found`.

- [ ] **Step 3: Buat migration**

Buat `database/migrations/2026_07_22_000002_create_media_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('mime');
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
```

- [ ] **Step 4: Buat model**

Buat `app/Models/Media.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Media extends Model
{
    /** @use HasFactory<\Database\Factories\MediaFactory> */
    use HasFactory;

    protected $table = 'media';

    protected $fillable = ['user_id', 'path', 'mime', 'size', 'width', 'height'];

    protected function casts(): array
    {
        return [
            'size'   => 'integer',
            'width'  => 'integer',
            'height' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

`$table` ditulis eksplisit karena bentuk jamak dari "media" menurut Laravel adalah `medias`, bukan `media`.

- [ ] **Step 5: Buat factory**

Buat `database/factories/MediaFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Media>
 */
class MediaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'path'    => 'media/'.fake()->uuid().'.jpg',
            'mime'    => 'image/jpeg',
            'size'    => fake()->numberBetween(10_000, 500_000),
            'width'   => 1200,
            'height'  => 800,
        ];
    }
}
```

- [ ] **Step 6: Jalankan test, pastikan LULUS**

```powershell
php artisan test --filter=MediaModelTest
```

Expected: 4 test PASS.

- [ ] **Step 7: Commit**

```powershell
git add app/Models/Media.php database/factories/MediaFactory.php database/migrations tests/Feature/MediaModelTest.php
git commit -m @'
feat: add Media model for uploaded files

Store uploads outside the portfolio document so the document stays small
and autosave stays fast.
'@
```

---

## Task 5: Model `Snapshot` + migration + factory

Snapshot menyimpan salinan dokumen untuk version history di Phase 7. Tabelnya dibuat sekarang bersama yang lain supaya seluruh skema selesai dalam satu phase.

**Files:**
- Create: `database/migrations/2026_07_22_000003_create_snapshots_table.php`
- Create: `app/Models/Snapshot.php`
- Create: `database/factories/SnapshotFactory.php`
- Test: `tests/Feature/SnapshotModelTest.php`

**Interfaces:**
- Consumes: `App\Models\Portfolio` dari Task 3.
- Produces:
  - `App\Models\Snapshot` dengan kolom `id, portfolio_id, document, revision, label, created_at, updated_at`
  - Cast: `document` → `array`, `revision` → `integer`
  - Relasi: `Snapshot::portfolio(): BelongsTo`, `Portfolio::snapshots(): HasMany`
  - `Database\Factories\SnapshotFactory`

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/Feature/SnapshotModelTest.php`:

```php
<?php

use App\Models\Portfolio;
use App\Models\Snapshot;

it('belongs to a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $snapshot  = Snapshot::factory()->for($portfolio)->create();

    expect($snapshot->portfolio->id)->toBe($portfolio->id);
});

it('exposes snapshots from the portfolio side', function () {
    $portfolio = Portfolio::factory()->create();
    Snapshot::factory()->count(3)->for($portfolio)->create();

    expect($portfolio->snapshots)->toHaveCount(3);
});

it('casts document to an array', function () {
    $document = ['version' => 1, 'theme' => 'brutalist', 'sections' => []];

    $snapshot = Snapshot::factory()->create(['document' => $document]);

    expect($snapshot->fresh()->document)->toBe($document);
});

it('allows a null label', function () {
    expect(Snapshot::factory()->create(['label' => null])->label)->toBeNull();
});

it('is deleted when its portfolio is deleted', function () {
    $portfolio = Portfolio::factory()->create();
    $snapshot  = Snapshot::factory()->for($portfolio)->create();

    $portfolio->delete();

    expect(Snapshot::find($snapshot->id))->toBeNull();
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```powershell
php artisan test --filter=SnapshotModelTest
```

Expected: FAIL dengan `Class "App\Models\Snapshot" not found`.

- [ ] **Step 3: Buat migration**

Buat `database/migrations/2026_07_22_000003_create_snapshots_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->json('document');
            $table->unsignedInteger('revision');
            $table->string('label')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('snapshots');
    }
};
```

- [ ] **Step 4: Buat model**

Buat `app/Models/Snapshot.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Snapshot extends Model
{
    /** @use HasFactory<\Database\Factories\SnapshotFactory> */
    use HasFactory;

    protected $fillable = ['portfolio_id', 'document', 'revision', 'label'];

    protected function casts(): array
    {
        return [
            'document' => 'array',
            'revision' => 'integer',
        ];
    }

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }
}
```

- [ ] **Step 5: Tambahkan relasi `snapshots` ke `Portfolio`**

Di `app/Models/Portfolio.php`, tambahkan import dan method berikut setelah method `user()`:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

```php
    public function snapshots(): HasMany
    {
        return $this->hasMany(Snapshot::class);
    }
```

- [ ] **Step 6: Buat factory**

Buat `database/factories/SnapshotFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Portfolio;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Snapshot>
 */
class SnapshotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'portfolio_id' => Portfolio::factory(),
            'document'     => [
                'version'  => 1,
                'theme'    => 'minimal',
                'template' => 'blank',
                'meta'     => ['title' => '', 'description' => ''],
                'sections' => [],
            ],
            'revision' => fake()->numberBetween(1, 50),
            'label'    => null,
        ];
    }
}
```

- [ ] **Step 7: Jalankan test, pastikan LULUS**

```powershell
php artisan test --filter=SnapshotModelTest
```

Expected: 5 test PASS.

- [ ] **Step 8: Commit**

```powershell
git add app/Models/Snapshot.php app/Models/Portfolio.php database/factories/SnapshotFactory.php database/migrations tests/Feature/SnapshotModelTest.php
git commit -m @'
feat: add Snapshot model for portfolio version history

Store document copies alongside the revision they came from so Phase 7
can restore an earlier version.
'@
```

---

## Task 6: `PortfolioPolicy`

Laravel menemukan policy secara otomatis lewat konvensi nama — `App\Policies\PortfolioPolicy` langsung terpakai untuk `App\Models\Portfolio` tanpa perlu didaftarkan di mana pun.

**Files:**
- Create: `app/Policies/PortfolioPolicy.php`
- Test: `tests/Feature/PortfolioPolicyTest.php`

**Interfaces:**
- Consumes: `App\Models\Portfolio`, `App\Models\User`.
- Produces: `PortfolioPolicy` dengan method `view`, `update`, `delete`, masing-masing `(User $user, Portfolio $portfolio): bool`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/Feature/PortfolioPolicyTest.php`:

```php
<?php

use App\Models\Portfolio;
use App\Models\User;

it('lets the owner view their portfolio', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($user->can('view', $portfolio))->toBeTrue();
});

it('lets the owner update their portfolio', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($user->can('update', $portfolio))->toBeTrue();
});

it('lets the owner delete their portfolio', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($user->can('delete', $portfolio))->toBeTrue();
});

it('stops a different user from viewing a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger  = User::factory()->create();

    expect($stranger->can('view', $portfolio))->toBeFalse();
});

it('stops a different user from updating a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger  = User::factory()->create();

    expect($stranger->can('update', $portfolio))->toBeFalse();
});

it('stops a different user from deleting a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger  = User::factory()->create();

    expect($stranger->can('delete', $portfolio))->toBeFalse();
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```powershell
php artisan test --filter=PortfolioPolicyTest
```

Expected: FAIL — tanpa policy, `can('update', ...)` mengembalikan `false`, jadi ketiga test "owner" gagal. Tiga test "stranger" akan lulus secara kebetulan; itu wajar dan bukan alasan melewatkan langkah ini.

- [ ] **Step 3: Buat policy**

Buat `app/Policies/PortfolioPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\Portfolio;
use App\Models\User;

class PortfolioPolicy
{
    public function view(User $user, Portfolio $portfolio): bool
    {
        return $this->owns($user, $portfolio);
    }

    public function update(User $user, Portfolio $portfolio): bool
    {
        return $this->owns($user, $portfolio);
    }

    public function delete(User $user, Portfolio $portfolio): bool
    {
        return $this->owns($user, $portfolio);
    }

    private function owns(User $user, Portfolio $portfolio): bool
    {
        return $user->id === $portfolio->user_id;
    }
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

```powershell
php artisan test --filter=PortfolioPolicyTest
```

Expected: 6 test PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/Policies/PortfolioPolicy.php tests/Feature/PortfolioPolicyTest.php
git commit -m @'
feat: add PortfolioPolicy restricting access to the owner
'@
```

---

## Task 7: Dashboard "My Portfolios" dengan empty state

Starter kit sudah punya halaman dashboard. Task ini menggantinya dengan daftar portfolio milik user — yang di Phase 0 selalu kosong, karena belum ada cara membuatnya. Tombol "New portfolio" belum berfungsi; itu Phase 2.

**Files:**
- Create: `app/Http/Controllers/DashboardController.php`
- Create: `resources/js/components/empty-state.tsx`
- Modify: `resources/js/pages/dashboard.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/DashboardTest.php`

**Interfaces:**
- Consumes: `App\Models\Portfolio`, komponen layout dari starter kit.
- Produces:
  - Route bernama `dashboard` pada `GET /dashboard`, memakai `DashboardController`
  - Prop Inertia `portfolios: Array<{ id: number; title: string; slug: string | null; updated_at: string }>`
  - Komponen `EmptyState` dengan prop `{ title: string; description: string; action?: React.ReactNode }`

- [ ] **Step 1: Periksa bentuk dashboard bawaan starter kit**

```powershell
Get-ChildItem resources\js\pages -Recurse -Filter *ashboard*
Select-String -Path routes\web.php -Pattern 'dashboard'
```

Catat nama file dan nama komponen yang sebenarnya (starter kit terbaru memakai nama berhuruf kecil seperti `resources/js/pages/dashboard.tsx`). **Kalau path yang ditemukan berbeda dari yang tertulis di task ini, pakai yang ditemukan** — dan sesuaikan juga nama komponen di dalam `assertInertia` pada Step 2.

- [ ] **Step 2: Tulis test yang gagal**

Buat `tests/Feature/DashboardTest.php`:

```php
<?php

use App\Models\Portfolio;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('redirects guests to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

it('shows no portfolios for a new user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('dashboard')
            ->has('portfolios', 0)
        );
});

it('lists the portfolios belonging to the user', function () {
    $user = User::factory()->create();
    Portfolio::factory()->count(2)->for($user)->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('portfolios', 2)
            ->has('portfolios.0', fn (AssertableInertia $item) => $item
                ->hasAll(['id', 'title', 'slug', 'updated_at'])
            )
        );
});

it('never lists portfolios belonging to someone else', function () {
    $user = User::factory()->create();
    Portfolio::factory()->count(3)->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('portfolios', 0));
});
```

- [ ] **Step 3: Jalankan test, pastikan GAGAL**

```powershell
php artisan test --filter=DashboardTest
```

Expected: test pertama mungkin sudah lulus (starter kit sudah melindungi `/dashboard`), tapi tiga sisanya FAIL karena prop `portfolios` belum ada.

- [ ] **Step 4: Buat controller**

Buat `app/Http/Controllers/DashboardController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $portfolios = $request->user()
            ->portfolios()
            ->latest('updated_at')
            ->get()
            ->map(fn ($portfolio) => [
                'id'         => $portfolio->id,
                'title'      => $portfolio->title,
                'slug'       => $portfolio->slug,
                'updated_at' => $portfolio->updated_at->toIso8601String(),
            ]);

        return Inertia::render('dashboard', [
            'portfolios' => $portfolios,
        ]);
    }
}
```

Kalau Step 1 menemukan nama komponen selain `dashboard`, ganti argumen `Inertia::render` agar cocok.

- [ ] **Step 5: Tambahkan relasi `portfolios` ke `User`**

Di `app/Models/User.php`, tambahkan import dan method:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

```php
    public function portfolios(): HasMany
    {
        return $this->hasMany(Portfolio::class);
    }
```

`Portfolio` tidak perlu di-import karena `User` berada di namespace yang sama (`App\Models`).

- [ ] **Step 6: Arahkan route dashboard ke controller**

Di `routes/web.php`, ganti closure dashboard bawaan starter kit dengan:

```php
use App\Http\Controllers\DashboardController;

Route::get('dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');
```

Pertahankan middleware yang sudah dipakai starter kit. Kalau starter kit tidak memakai `verified`, jangan tambahkan.

- [ ] **Step 7: Buat komponen `EmptyState`**

Buat `resources/js/components/empty-state.tsx`:

```tsx
import type { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-12 text-center">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}
```

- [ ] **Step 8: Pakai `EmptyState` di halaman dashboard**

Ubah `resources/js/pages/dashboard.tsx` sehingga menerima prop `portfolios` dan menampilkan `EmptyState` saat kosong. Pertahankan layout dan import bawaan starter kit; hanya isi halamannya yang diganti:

```tsx
import { EmptyState } from '@/components/empty-state';

interface PortfolioSummary {
    id: number;
    title: string;
    slug: string | null;
    updated_at: string;
}

interface DashboardProps {
    portfolios: PortfolioSummary[];
}

export default function Dashboard({ portfolios }: DashboardProps) {
    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-2xl font-semibold">My Portfolios</h1>

            {portfolios.length === 0 ? (
                <EmptyState
                    title="No portfolios yet"
                    description="Your portfolios will appear here once you create one."
                />
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolios.map((portfolio) => (
                        <li key={portfolio.id} className="rounded-xl border p-4">
                            <p className="font-medium">{portfolio.title}</p>
                            <p className="text-sm text-muted-foreground">
                                {portfolio.slug ?? 'Draft'}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

Bungkus isi di atas dengan komponen layout yang dipakai halaman dashboard bawaan (misalnya `AppLayout`) supaya navigasi starter kit tidak hilang.

- [ ] **Step 9: Jalankan test, pastikan LULUS**

```powershell
php artisan test --filter=DashboardTest
```

Expected: 4 test PASS.

- [ ] **Step 10: Pastikan TypeScript dan build bersih**

```powershell
npm run build
```

Expected: selesai tanpa error TypeScript.

- [ ] **Step 11: Commit**

```powershell
git add app/Http/Controllers/DashboardController.php app/Models/User.php routes/web.php resources/js/components/empty-state.tsx resources/js/pages tests/Feature/DashboardTest.php
git commit -m @'
feat: show the user's portfolios on the dashboard

Replace the starter kit dashboard with a list scoped to the signed-in
user, falling back to an empty state until portfolio creation lands.
'@
```

---

## Task 8: Harness test frontend (Vitest)

Design doc mensyaratkan test frontend memakai Vitest. Dipasang sekarang, saat belum ada apa-apa untuk dites, supaya di Phase 2 store editor bisa langsung ditulis secara TDD tanpa terhambat setup.

**Files:**
- Create: `vitest.config.ts`
- Create: `resources/js/components/empty-state.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `EmptyState` dari Task 7.
- Produces: perintah `npm run test` yang menjalankan Vitest sekali jalan (bukan mode watch).

- [ ] **Step 1: Pasang dependensi**

```powershell
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/dom
```

- [ ] **Step 2: Buat konfigurasi Vitest**

Buat `vitest.config.ts` di root:

```ts
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['resources/js/**/*.test.{ts,tsx}'],
    },
});
```

File ini terpisah dari `vite.config.ts` supaya konfigurasi build aplikasi tidak tercampur dengan konfigurasi test. Alias `@` disamakan dengan yang dipakai starter kit; kalau starter kit memakai alias lain, samakan dengan itu.

Kalau `@vitejs/plugin-react` ternyata tidak ada di `package.json` (starter kit mungkin memakai plugin lain), pasang dengan `npm install -D @vitejs/plugin-react`.

- [ ] **Step 3: Tambahkan skrip `test`**

Di `package.json`, tambahkan ke dalam `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Tulis test yang gagal**

Buat `resources/js/components/empty-state.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
    it('renders the title and description', () => {
        render(<EmptyState title="No portfolios yet" description="Nothing here." />);

        expect(screen.getByText('No portfolios yet')).toBeDefined();
        expect(screen.getByText('Nothing here.')).toBeDefined();
    });

    it('renders an action when one is given', () => {
        render(
            <EmptyState
                title="No portfolios yet"
                description="Nothing here."
                action={<button>New portfolio</button>}
            />,
        );

        expect(screen.getByRole('button', { name: 'New portfolio' })).toBeDefined();
    });

    it('renders no action when none is given', () => {
        render(<EmptyState title="No portfolios yet" description="Nothing here." />);

        expect(screen.queryByRole('button')).toBeNull();
    });
});
```

- [ ] **Step 5: Jalankan test**

```powershell
npm run test
```

Expected: 3 test PASS. Kalau gagal dengan error resolusi modul, periksa alias `@` di Step 2 dan pastikan `EmptyState` diekspor sebagai named export dari `resources/js/components/empty-state.tsx`.

- [ ] **Step 6: Commit**

```powershell
git add vitest.config.ts package.json package-lock.json resources/js/components/empty-state.test.tsx
git commit -m @'
test: add Vitest harness for frontend components

Wire up Vitest, jsdom, and Testing Library now so the editor store in
Phase 2 can be written test-first without setup friction.
'@
```

---

## Task 9: Verifikasi kelulusan Phase 0

Phase 0 dinyatakan selesai hanya kalau seluruh perintah di bawah ini berhasil dari repo yang bersih. Jangan lanjut ke Phase 1 sebelum semuanya hijau.

**Files:** tidak ada yang dibuat — task ini murni verifikasi.

- [ ] **Step 1: Pastikan seluruh migration jalan dari nol**

```powershell
php artisan migrate:fresh
```

Expected: `users`, `portfolios`, `media`, `snapshots`, dan tabel bawaan Laravel terbentuk tanpa error.

- [ ] **Step 2: Jalankan seluruh test backend**

```powershell
php artisan test
```

Expected: seluruh test PASS — test bawaan starter kit ditambah `PortfolioModelTest` (6), `MediaModelTest` (4), `SnapshotModelTest` (5), `PortfolioPolicyTest` (6), `DashboardTest` (4).

- [ ] **Step 3: Jalankan seluruh test frontend**

```powershell
npm run test
```

Expected: 3 test PASS.

- [ ] **Step 4: Pastikan build produksi berhasil**

```powershell
npm run build
```

Expected: selesai tanpa error.

- [ ] **Step 5: Buktikan alur auth benar-benar jalan di browser**

```powershell
php artisan serve
```

Buka `http://127.0.0.1:8000` di browser, lalu:

1. Daftar akun baru.
2. Pastikan berhasil masuk ke `/dashboard`.
3. Pastikan tampil judul "My Portfolios" dan empty state "No portfolios yet".
4. Logout, lalu coba buka `/dashboard` langsung — harus dilempar ke `/login`.

Hentikan server dengan `Ctrl+C`.

Langkah ini tidak bisa digantikan oleh test otomatis: test membuktikan controller mengirim prop yang benar, browser membuktikan halamannya benar-benar tampil.

- [ ] **Step 6: Pastikan repo bersih**

```powershell
git status --short
```

Expected: kosong.

- [ ] **Step 7: Tandai Phase 0 selesai**

Di `docs/portly-design.md`, pada bagian "Phase 0 — Fondasi", tambahkan baris:

```markdown
**Status:** Selesai 2026-07-22.
```

Centang juga seluruh checkbox di rencana ini, lalu commit keduanya:

```powershell
git add docs/portly-design.md docs/plans/2026-07-22-phase-0-fondasi.md
git commit -m @'
docs: mark Phase 0 as complete
'@
```

---

## Yang Sengaja TIDAK Dikerjakan di Phase 0

Kalau salah satu dari ini terasa ingin dikerjakan sekarang, tahan — masing-masing punya phase-nya sendiri:

| Bukan sekarang | Phase |
|---|---|
| Tipe `SectionDefinition`, registry section | 1 |
| Token tema CSS, theme hooks | 1 |
| Membuat / mengganti nama / menghapus portfolio | 2 |
| Editor, canvas, drag & drop, autosave, revision | 2 |
| Panel Properties, komponen field, upload media | 3 |
| Kelima tema | 4 |
| Slug, publish, halaman publik, SSR | 6 |
| Undo/redo, version history, template | 7 |
| Export ZIP, landing page | 8 |

`Media` dan `Snapshot` memang dibuat sekarang meski baru terpakai di Phase 3 dan Phase 7 — alasannya satu: menyelesaikan seluruh skema database dalam satu migrasi awal jauh lebih murah daripada menambalnya belakangan.
