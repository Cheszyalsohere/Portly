# Portly Phase 1 — Mesin Section: Implementation Plan

> **Untuk pengerjaan bertahap:** setiap step pakai checkbox (`- [ ]`). Kerjakan berurutan, jangan lompat — tiap task berakhir dengan commit yang berdiri sendiri.

**Goal:** Sebuah halaman merender portfolio dari dokumen JSON — About dan Projects, masing-masing dengan dua variant, di dua tema — membuktikan mesin schema-driven benar **sebelum** ada editor.

**Arsitektur:** Satu section = satu file definisi (`SectionDefinition`) yang didaftarkan di registry. `SectionRenderer` memilih komponen variant dari `section.variant`; `PortfolioRenderer` menyetel `data-pf-theme` dan merender daftar section. Warna/font/bentuk datang dari token CSS `--pf-*` dan sekumpulan class hook (`.pf-card`, `.pf-heading`, …); tata letak datang dari utilitas Tailwind. Komponen render yang sama nantinya dipakai editor dan halaman publik — di Phase 1 dipakai halaman preview sementara.

**Tech Stack:** React 19 + TypeScript (strict), Tailwind 4, Inertia 3, Laravel 13, Vitest, Pest.

## Global Constraints

- **Jangan pernah** menambahkan trailer `Co-Authored-By` pada commit apa pun.
- **Jangan pernah** `git push` kecuali diminta secara eksplisit.
- Stage dengan path eksplisit — **jangan** `git add -A` atau `git add .`.
- Satu file maksimal ~300 baris. Lewat itu, pecah.
- Semua perintah dijalankan dari `D:\Project_Belajar\Portly`.
- Shell adalah **PowerShell 5.1**: tidak ada `&&`, tidak ada `??`, tidak ada ternary. Berantai: `A; if ($?) { B }`.
- **JANGAN edit file berisi non-ASCII (em-dash dsb) pakai `Get-Content`/`Set-Content` di PowerShell** — PS 5.1 membaca UTF-8-tanpa-BOM sebagai ANSI dan merusaknya jadi mojibake. Pakai tool Edit/Write.
- Tulis test **sebelum** implementasi. Jalankan dan pastikan gagal dulu.
- Komponen render section **dilarang** menulis warna/font/radius langsung. Semua lewat token `--pf-*` atau class hook `.pf-*`.
- Alias import: `@/` → `resources/js/`.

## Konteks dari Phase 0 (sudah terpasang, jangan dibuat ulang)

- `App\Models\Portfolio` punya kolom `document` (cast `array`), relasi `user()`, dan `PortfolioPolicy` dengan method `view/update/delete` (pemilik-saja, auto-discovered).
- `PortfolioFactory` menghasilkan `document` default `{version:1, theme:'minimal', template:'blank', meta:{title,description}, sections:[]}`.
- Base `App\Http\Controllers\Controller` **kosong** — tidak ada trait `AuthorizesRequests`. Gunakan `Gate::authorize(...)`, bukan `$this->authorize(...)`.
- Halaman Inertia tanpa chrome editor diatur di `resources/js/app.tsx` — resolver `layout` mengembalikan `null` untuk nama tertentu (`welcome`). Tambahkan `preview` ke daftar itu.
- Vitest sudah terpasang (`npm run test`), alias `@` sudah dikonfigurasi di `vitest.config.ts`.

---

## Struktur File

| File | Tanggung jawab | Task |
|---|---|---|
| `resources/js/types/document.ts` | Tipe `PortfolioDocument`, `SectionInstance` | 1 |
| `resources/js/types/section.ts` | Tipe `SectionDefinition`, `FieldDefinition`, `VariantDefinition`, `SectionRenderProps` | 1 |
| `resources/css/portfolio.css` | Token `--pf-*` (minimal + dark) + class hook `.pf-*` | 1 |
| `resources/css/app.css` | Tambah `@import` untuk portfolio.css | 1 |
| `resources/js/sections/about.ts` | Definisi About + `AboutData` + `toAboutData` | 2 |
| `resources/js/sections/render/about/about-image-left.tsx` | Variant About image-left | 2 |
| `resources/js/sections/render/about/about-centered.tsx` | Variant About centered | 2 |
| `resources/js/sections/about.test.tsx` | Coercion + render tiap variant | 2 |
| `resources/js/sections/index.ts` | Registry + `getSectionDefinition` | 3 |
| `resources/js/sections/section-renderer.tsx` | Pilih variant, fallback unknown | 3 |
| `resources/js/sections/portfolio-renderer.tsx` | Set `data-pf-theme`, render daftar section | 3 |
| `resources/js/sections/section-renderer.test.tsx` | Fallback unknown type & variant | 3 |
| `resources/js/sections/portfolio-renderer.test.tsx` | Theme attr + sembunyikan hidden | 3 |
| `resources/js/sections/index.test.ts` | Integritas registry (menyapu semua definisi) | 3 |
| `resources/js/sections/projects.ts` | Definisi Projects + `ProjectsData` + `toProjectsData` | 4 |
| `resources/js/sections/render/projects/projects-grid.tsx` | Variant Projects grid | 4 |
| `resources/js/sections/render/projects/projects-cards.tsx` | Variant Projects cards | 4 |
| `resources/js/sections/projects.test.tsx` | Coercion (termasuk list) + render tiap variant | 4 |
| `app/Http/Controllers/PreviewController.php` | Render portfolio milik user ke Inertia | 5 |
| `resources/js/pages/preview.tsx` | Halaman Inertia preview (tanpa layout) | 5 |
| `database/seeders/PortfolioDemoSeeder.php` | Dua portfolio demo (tema+variant beda) | 5 |
| `tests/Feature/PreviewControllerTest.php` | Auth, kepemilikan, prop document | 5 |
| `routes/web.php`, `resources/js/app.tsx` | Route preview + null-layout | 5 |

**Sifat sementara:** halaman `preview`, `PreviewController`, dan route-nya adalah perancah Phase 1 untuk melihat mesin bekerja. Phase 6 menggantinya dengan halaman publik `/p/{slug}` yang memakai `PortfolioRenderer` yang sama. Seeder demo boleh tetap ada sebagai alat dev.

---

## Task 1: Tipe dokumen/section + tulang punggung tema CSS

Task ini murni tipe dan stylesheet, jadi gerbangnya bukan unit test melainkan `types:check` + `build` bersih. Tidak ada perilaku runtime untuk dites di sini; perilaku pertama muncul di Task 2.

**Files:**
- Create: `resources/js/types/document.ts`, `resources/js/types/section.ts`, `resources/css/portfolio.css`
- Modify: `resources/css/app.css`

**Interfaces:**
- Produces:
  - `PortfolioDocument { version: number; theme: string; template: string; meta: { title: string; description: string }; sections: SectionInstance[] }`
  - `SectionInstance { id: string; type: string; variant: string; visible: boolean; data: Record<string, unknown> }`
  - `FieldType = 'text'|'textarea'|'image'|'select'|'color'|'number'|'url'|'toggle'|'list'`
  - `FieldDefinition { key: string; type: FieldType; label: string; options?: {label:string;value:string}[]; fields?: FieldDefinition[] }`
  - `SectionRenderProps { data: Record<string, unknown> }`
  - `VariantDefinition { label: string; render: ComponentType<SectionRenderProps> }`
  - `SectionDefinition { type: string; label: string; defaults: Record<string, unknown>; fields: FieldDefinition[]; variants: Record<string, VariantDefinition>; defaultVariant: string }`
  - Class hook CSS: `.pf-root .pf-section .pf-heading .pf-subheading .pf-body .pf-card .pf-tag .pf-media .pf-button .pf-link`
  - Token tema untuk `[data-pf-theme="minimal"]` dan `[data-pf-theme="dark"]`

- [ ] **Step 1: Buat `resources/js/types/document.ts`**

```ts
export interface SectionInstance {
    id: string;
    type: string;
    variant: string;
    visible: boolean;
    data: Record<string, unknown>;
}

export interface PortfolioMeta {
    title: string;
    description: string;
}

export interface PortfolioDocument {
    version: number;
    theme: string;
    template: string;
    meta: PortfolioMeta;
    sections: SectionInstance[];
}
```

- [ ] **Step 2: Buat `resources/js/types/section.ts`**

```ts
import type { ComponentType } from 'react';

export type FieldType =
    | 'text'
    | 'textarea'
    | 'image'
    | 'select'
    | 'color'
    | 'number'
    | 'url'
    | 'toggle'
    | 'list';

export interface FieldOption {
    label: string;
    value: string;
}

export interface FieldDefinition {
    key: string;
    type: FieldType;
    label: string;
    options?: FieldOption[];
    fields?: FieldDefinition[];
}

export interface SectionRenderProps {
    data: Record<string, unknown>;
}

export interface VariantDefinition {
    label: string;
    render: ComponentType<SectionRenderProps>;
}

export interface SectionDefinition {
    type: string;
    label: string;
    defaults: Record<string, unknown>;
    fields: FieldDefinition[];
    variants: Record<string, VariantDefinition>;
    defaultVariant: string;
}
```

- [ ] **Step 3: Buat `resources/css/portfolio.css`**

```css
/*
 * Portfolio theming contract.
 *
 * Section components MUST NOT hardcode colour, font, or shape. They read
 * these tokens (via the hook classes below) so that switching
 * data-pf-theme restyles the whole page with no React re-render.
 *
 * Two layers:
 *   1. Tokens  — per-theme values under [data-pf-theme="..."].
 *   2. Hooks   — documented classes section components attach to. Themes
 *      may override these classes; they must never target a section's own
 *      internal class names.
 */

[data-pf-theme='minimal'] {
    --pf-bg: #ffffff;
    --pf-surface: #f7f7f8;
    --pf-text: #111827;
    --pf-muted: #6b7280;
    --pf-accent: #2563eb;
    --pf-accent-contrast: #ffffff;
    --pf-border: #e5e7eb;

    --pf-font-head: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
    --pf-font-body: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
    --pf-weight-head: 600;
    --pf-tracking-head: -0.02em;
    --pf-leading: 1.6;

    --pf-radius: 12px;
    --pf-radius-sm: 8px;
    --pf-border-width: 1px;
    --pf-shadow: 0 1px 3px rgb(0 0 0 / 0.08);

    --pf-section-py: 5rem;
    --pf-container: 72rem;
}

[data-pf-theme='dark'] {
    --pf-bg: #0a0a0a;
    --pf-surface: #161616;
    --pf-text: #fafafa;
    --pf-muted: #a1a1aa;
    --pf-accent: #ffffff;
    --pf-accent-contrast: #0a0a0a;
    --pf-border: #262626;

    --pf-font-head: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
    --pf-font-body: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
    --pf-weight-head: 600;
    --pf-tracking-head: -0.01em;
    --pf-leading: 1.7;

    --pf-radius: 10px;
    --pf-radius-sm: 6px;
    --pf-border-width: 1px;
    --pf-shadow: none;

    --pf-section-py: 5rem;
    --pf-container: 72rem;
}

.pf-root {
    background: var(--pf-bg);
    color: var(--pf-text);
    font-family: var(--pf-font-body);
    min-height: 100vh;
}

.pf-section {
    padding-block: var(--pf-section-py);
}

.pf-section-inner {
    max-width: var(--pf-container);
    margin-inline: auto;
    padding-inline: 1.5rem;
}

.pf-heading {
    font-family: var(--pf-font-head);
    font-weight: var(--pf-weight-head);
    letter-spacing: var(--pf-tracking-head);
    color: var(--pf-text);
}

.pf-subheading {
    color: var(--pf-muted);
    font-weight: 500;
}

.pf-body {
    color: var(--pf-muted);
    line-height: var(--pf-leading);
}

.pf-card {
    background: var(--pf-surface);
    border: var(--pf-border-width) solid var(--pf-border);
    border-radius: var(--pf-radius);
    box-shadow: var(--pf-shadow);
    padding: 1.25rem;
}

.pf-tag {
    display: inline-block;
    background: var(--pf-bg);
    border: 1px solid var(--pf-border);
    border-radius: 999px;
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;
    color: var(--pf-muted);
}

.pf-media {
    background: var(--pf-surface);
    border: var(--pf-border-width) solid var(--pf-border);
    border-radius: var(--pf-radius);
    object-fit: cover;
}

.pf-button {
    display: inline-block;
    background: var(--pf-accent);
    color: var(--pf-accent-contrast);
    border-radius: var(--pf-radius-sm);
    padding: 0.5rem 1rem;
    font-weight: 500;
}

.pf-link {
    color: var(--pf-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}
```

- [ ] **Step 4: Impor portfolio.css dari app.css**

Buka `resources/css/app.css`. Tepat setelah baris `@import 'tw-animate-css';` (baris 3), tambahkan:

```css
@import './portfolio.css';
```

- [ ] **Step 5: Verifikasi typecheck dan build bersih**

```powershell
npm run types:check
npm run build
```

Expected: dua-duanya selesai tanpa error. Kalau `types:check` mengeluh soal `ComponentType`, pastikan import di `section.ts` memakai `import type { ComponentType } from 'react'`.

- [ ] **Step 6: Commit**

```powershell
git add resources/js/types/document.ts resources/js/types/section.ts resources/css/portfolio.css resources/css/app.css
git commit -m @'
feat: add portfolio document types and theme token contract

Define PortfolioDocument/SectionDefinition types and a two-layer theming
contract: per-theme --pf-* tokens plus documented .pf-* hook classes that
section components attach to. Ship minimal and dark themes.
'@
```

---

## Task 2: Section About (definisi + dua variant)

Membangun section pertama secara terisolasi — sebelum registry — supaya coercion data dan render variant terbukti benar lebih dulu.

**Files:**
- Create: `resources/js/sections/about.ts`, `resources/js/sections/render/about/about-image-left.tsx`, `resources/js/sections/render/about/about-centered.tsx`
- Test: `resources/js/sections/about.test.tsx`

**Interfaces:**
- Consumes: `SectionDefinition`, `SectionRenderProps` (Task 1).
- Produces:
  - `AboutData { name: string; title: string; bio: string; photo: string | null }`
  - `toAboutData(raw: Record<string, unknown>): AboutData`
  - `aboutSection: SectionDefinition` dengan `type='about'`, `defaultVariant='image-left'`, variants `image-left` & `centered`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `resources/js/sections/about.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aboutSection, toAboutData } from './about';

describe('toAboutData', () => {
    it('fills every field from defaults when raw is empty', () => {
        const data = toAboutData({});

        expect(data.name).toBe('Your Name');
        expect(data.title).toBe('Your Title');
        expect(data.bio).toBe('');
        expect(data.photo).toBeNull();
    });

    it('keeps provided values and coerces types', () => {
        const data = toAboutData({ name: 'Irfan', title: 'Dev', bio: 'hi', photo: 'media/x.jpg' });

        expect(data.name).toBe('Irfan');
        expect(data.photo).toBe('media/x.jpg');
    });
});

describe('about variants', () => {
    it('exposes image-left as the default variant', () => {
        expect(aboutSection.defaultVariant).toBe('image-left');
        expect(Object.keys(aboutSection.variants)).toContain('image-left');
        expect(Object.keys(aboutSection.variants)).toContain('centered');
    });

    it.each(Object.entries(aboutSection.variants))(
        'renders the %s variant with the name',
        (_key, variant) => {
            const Render = variant.render;
            render(<Render data={{ ...aboutSection.defaults, name: 'Irfan Nuha' }} />);
            expect(screen.getByText('Irfan Nuha')).toBeDefined();
        },
    );
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```powershell
npm run test -- about
```

Expected: FAIL dengan modul `./about` tidak ditemukan.

- [ ] **Step 3: Buat `resources/js/sections/about.ts`**

```ts
import type { SectionDefinition } from '@/types/section';
import { AboutCentered } from './render/about/about-centered';
import { AboutImageLeft } from './render/about/about-image-left';

export interface AboutData {
    name: string;
    title: string;
    bio: string;
    photo: string | null;
}

const defaults: AboutData = {
    name: 'Your Name',
    title: 'Your Title',
    bio: '',
    photo: null,
};

export function toAboutData(raw: Record<string, unknown>): AboutData {
    return {
        name: typeof raw.name === 'string' ? raw.name : defaults.name,
        title: typeof raw.title === 'string' ? raw.title : defaults.title,
        bio: typeof raw.bio === 'string' ? raw.bio : defaults.bio,
        photo: typeof raw.photo === 'string' ? raw.photo : null,
    };
}

export const aboutSection: SectionDefinition = {
    type: 'about',
    label: 'About',
    defaults: { ...defaults },
    fields: [
        { key: 'name', type: 'text', label: 'Name' },
        { key: 'title', type: 'text', label: 'Job Title' },
        { key: 'bio', type: 'textarea', label: 'Description' },
        { key: 'photo', type: 'image', label: 'Profile Picture' },
    ],
    variants: {
        'image-left': { label: 'Image Left', render: AboutImageLeft },
        centered: { label: 'Centered', render: AboutCentered },
    },
    defaultVariant: 'image-left',
};
```

- [ ] **Step 4: Buat `resources/js/sections/render/about/about-image-left.tsx`**

```tsx
import type { SectionRenderProps } from '@/types/section';
import { toAboutData } from '@/sections/about';

export function AboutImageLeft({ data }: SectionRenderProps) {
    const about = toAboutData(data);

    return (
        <div className="pf-section-inner flex flex-col items-center gap-8 md:flex-row">
            <div className="pf-media aspect-square w-40 shrink-0 md:w-56">
                {about.photo ? (
                    <img
                        src={`/storage/${about.photo}`}
                        alt={about.name}
                        className="h-full w-full rounded-[inherit] object-cover"
                    />
                ) : null}
            </div>
            <div className="flex flex-col gap-3 text-center md:text-left">
                <h2 className="pf-heading text-3xl md:text-4xl">{about.name}</h2>
                <p className="pf-subheading text-lg">{about.title}</p>
                {about.bio ? <p className="pf-body max-w-prose">{about.bio}</p> : null}
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Buat `resources/js/sections/render/about/about-centered.tsx`**

```tsx
import type { SectionRenderProps } from '@/types/section';
import { toAboutData } from '@/sections/about';

export function AboutCentered({ data }: SectionRenderProps) {
    const about = toAboutData(data);

    return (
        <div className="pf-section-inner flex flex-col items-center gap-4 text-center">
            <div className="pf-media aspect-square w-32">
                {about.photo ? (
                    <img
                        src={`/storage/${about.photo}`}
                        alt={about.name}
                        className="h-full w-full rounded-[inherit] object-cover"
                    />
                ) : null}
            </div>
            <h2 className="pf-heading text-4xl">{about.name}</h2>
            <p className="pf-subheading text-lg">{about.title}</p>
            {about.bio ? <p className="pf-body max-w-prose">{about.bio}</p> : null}
        </div>
    );
}
```

- [ ] **Step 6: Jalankan test, pastikan LULUS**

```powershell
npm run test -- about
```

Expected: seluruh test di `about.test.tsx` PASS (2 coercion + 1 defaultVariant + 2 variant render).

- [ ] **Step 7: Commit**

```powershell
git add resources/js/sections/about.ts resources/js/sections/render/about resources/js/sections/about.test.tsx
git commit -m @'
feat: add About section with image-left and centered variants

Include a toAboutData coercion so every variant shares one data shape and
switching variants never drops content.
'@
```

---

## Task 3: Registry + SectionRenderer + PortfolioRenderer

Menyatukan section ke registry dan membangun dua komponen yang mengubah dokumen jadi DOM, lengkap dengan penanganan `type`/`variant` tak dikenal (§4 design doc).

**Files:**
- Create: `resources/js/sections/index.ts`, `resources/js/sections/section-renderer.tsx`, `resources/js/sections/portfolio-renderer.tsx`
- Test: `resources/js/sections/section-renderer.test.tsx`, `resources/js/sections/portfolio-renderer.test.tsx`, `resources/js/sections/index.test.ts`

**Interfaces:**
- Consumes: `aboutSection` (Task 2), `PortfolioDocument`, `SectionInstance`, `SectionDefinition`.
- Produces:
  - `sectionRegistry: Record<string, SectionDefinition>`
  - `sectionList: SectionDefinition[]`
  - `getSectionDefinition(type: string): SectionDefinition | undefined`
  - `<SectionRenderer section={SectionInstance} />`
  - `<PortfolioRenderer document={PortfolioDocument} />`

- [ ] **Step 1: Tulis test integritas registry (gagal dulu)**

Buat `resources/js/sections/index.test.ts`:

```ts
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { getSectionDefinition, sectionList, sectionRegistry } from './index';

describe('section registry', () => {
    it('registers the about section', () => {
        expect(getSectionDefinition('about')).toBeDefined();
    });

    it('returns undefined for an unknown type', () => {
        expect(getSectionDefinition('nope')).toBeUndefined();
    });

    it('is not empty', () => {
        expect(sectionList.length).toBeGreaterThan(0);
        expect(Object.keys(sectionRegistry)).toEqual(sectionList.map((d) => d.type));
    });
});

describe('every section definition is internally consistent', () => {
    it.each(sectionList.map((d) => [d.type, d] as const))(
        '%s has complete defaults, a valid defaultVariant, and renderable variants',
        (_type, def) => {
            for (const field of def.fields) {
                expect(Object.keys(def.defaults)).toContain(field.key);
            }
            expect(Object.keys(def.variants)).toContain(def.defaultVariant);
            for (const variant of Object.values(def.variants)) {
                expect(() =>
                    render(createElement(variant.render, { data: def.defaults })),
                ).not.toThrow();
            }
        },
    );
});
```

- [ ] **Step 2: Tulis test SectionRenderer (gagal dulu)**

Buat `resources/js/sections/section-renderer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SectionInstance } from '@/types/document';
import { SectionRenderer } from './section-renderer';

function instance(overrides: Partial<SectionInstance>): SectionInstance {
    return {
        id: 's_1',
        type: 'about',
        variant: 'image-left',
        visible: true,
        data: { name: 'Irfan' },
        ...overrides,
    };
}

describe('SectionRenderer', () => {
    it('renders the chosen variant', () => {
        render(<SectionRenderer section={instance({ variant: 'centered' })} />);
        expect(screen.getByText('Irfan')).toBeDefined();
    });

    it('falls back to the default variant when the variant is unknown', () => {
        render(<SectionRenderer section={instance({ variant: 'does-not-exist' })} />);
        expect(screen.getByText('Irfan')).toBeDefined();
    });

    it('shows a placeholder for an unknown section type', () => {
        render(<SectionRenderer section={instance({ type: 'ghost' })} />);
        expect(screen.getByText(/unknown section/i)).toBeDefined();
    });
});
```

- [ ] **Step 3: Tulis test PortfolioRenderer (gagal dulu)**

Buat `resources/js/sections/portfolio-renderer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PortfolioDocument } from '@/types/document';
import { PortfolioRenderer } from './portfolio-renderer';

function doc(overrides: Partial<PortfolioDocument>): PortfolioDocument {
    return {
        version: 1,
        theme: 'minimal',
        template: 'blank',
        meta: { title: '', description: '' },
        sections: [],
        ...overrides,
    };
}

describe('PortfolioRenderer', () => {
    it('sets the theme attribute from the document', () => {
        const { container } = render(<PortfolioRenderer document={doc({ theme: 'dark' })} />);
        expect(container.querySelector('[data-pf-theme="dark"]')).not.toBeNull();
    });

    it('does not render hidden sections', () => {
        render(
            <PortfolioRenderer
                document={doc({
                    sections: [
                        { id: 'a', type: 'about', variant: 'centered', visible: false, data: { name: 'Hidden' } },
                        { id: 'b', type: 'about', variant: 'centered', visible: true, data: { name: 'Shown' } },
                    ],
                })}
            />,
        );
        expect(screen.queryByText('Hidden')).toBeNull();
        expect(screen.getByText('Shown')).toBeDefined();
    });
});
```

- [ ] **Step 4: Jalankan ketiga test, pastikan GAGAL**

```powershell
npm run test -- sections
```

Expected: FAIL karena `./index`, `./section-renderer`, `./portfolio-renderer` belum ada.

- [ ] **Step 5: Buat registry `resources/js/sections/index.ts`**

```ts
import type { SectionDefinition } from '@/types/section';
import { aboutSection } from './about';

export const sectionRegistry: Record<string, SectionDefinition> = {
    [aboutSection.type]: aboutSection,
};

export const sectionList: SectionDefinition[] = Object.values(sectionRegistry);

export function getSectionDefinition(type: string): SectionDefinition | undefined {
    return sectionRegistry[type];
}
```

- [ ] **Step 6: Buat `resources/js/sections/section-renderer.tsx`**

```tsx
import type { SectionInstance } from '@/types/document';
import { getSectionDefinition } from './index';

export function SectionRenderer({ section }: { section: SectionInstance }) {
    const def = getSectionDefinition(section.type);

    if (!def) {
        return (
            <section className="pf-section" data-section-type={section.type}>
                <div className="pf-section-inner pf-body">
                    Unknown section: {section.type}
                </div>
            </section>
        );
    }

    const variant = def.variants[section.variant] ?? def.variants[def.defaultVariant];
    const Render = variant.render;

    return (
        <section className="pf-section" data-section-type={section.type}>
            <Render data={section.data} />
        </section>
    );
}
```

- [ ] **Step 7: Buat `resources/js/sections/portfolio-renderer.tsx`**

```tsx
import type { PortfolioDocument } from '@/types/document';
import { SectionRenderer } from './section-renderer';

export function PortfolioRenderer({ document }: { document: PortfolioDocument }) {
    const visible = document.sections.filter((section) => section.visible);

    return (
        <div className="pf-root" data-pf-theme={document.theme}>
            {visible.map((section) => (
                <SectionRenderer key={section.id} section={section} />
            ))}
        </div>
    );
}
```

- [ ] **Step 8: Jalankan test, pastikan LULUS**

```powershell
npm run test -- sections
```

Expected: seluruh test di ketiga file PASS.

- [ ] **Step 9: Commit**

```powershell
git add resources/js/sections/index.ts resources/js/sections/section-renderer.tsx resources/js/sections/portfolio-renderer.tsx resources/js/sections/index.test.ts resources/js/sections/section-renderer.test.tsx resources/js/sections/portfolio-renderer.test.tsx
git commit -m @'
feat: add section registry and document renderers

SectionRenderer resolves a variant and falls back to the default variant
on an unknown variant, or a placeholder on an unknown type.
PortfolioRenderer sets data-pf-theme and skips hidden sections. A registry
integrity test renders every variant of every section with its defaults.
'@
```

---

## Task 4: Section Projects (definisi + dua variant, dengan field list)

Section kedua. Projects membawa field bertipe `list` (daftar proyek), jadi task ini juga membuktikan bentuk data list dan integritas registry tetap hijau untuk dua section.

**Files:**
- Create: `resources/js/sections/projects.ts`, `resources/js/sections/render/projects/projects-grid.tsx`, `resources/js/sections/render/projects/projects-cards.tsx`
- Modify: `resources/js/sections/index.ts`
- Test: `resources/js/sections/projects.test.tsx`

**Interfaces:**
- Consumes: `SectionDefinition`, `SectionRenderProps`.
- Produces:
  - `ProjectItem { title: string; description: string; tech: string; url: string; repo: string; image: string | null }`
  - `ProjectsData { heading: string; items: ProjectItem[] }`
  - `toProjectsData(raw: Record<string, unknown>): ProjectsData`
  - `projectsSection: SectionDefinition` (`type='projects'`, `defaultVariant='grid'`, variants `grid` & `cards`)

- [ ] **Step 1: Tulis test yang gagal**

Buat `resources/js/sections/projects.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projectsSection, toProjectsData } from './projects';

describe('toProjectsData', () => {
    it('returns the default heading and one sample item when raw is empty', () => {
        const data = toProjectsData({});
        expect(data.heading).toBe('Projects');
        expect(data.items.length).toBeGreaterThan(0);
    });

    it('coerces a raw items array, dropping malformed entries to defaults', () => {
        const data = toProjectsData({
            heading: 'Work',
            items: [{ title: 'Portly', tech: 'Laravel' }],
        });
        expect(data.heading).toBe('Work');
        expect(data.items[0].title).toBe('Portly');
        expect(data.items[0].tech).toBe('Laravel');
        expect(data.items[0].description).toBe('');
        expect(data.items[0].image).toBeNull();
    });

    it('falls back to a sample item when items is not an array', () => {
        const data = toProjectsData({ items: 'nope' });
        expect(Array.isArray(data.items)).toBe(true);
        expect(data.items.length).toBeGreaterThan(0);
    });
});

describe('projects variants', () => {
    it('exposes grid as the default variant', () => {
        expect(projectsSection.defaultVariant).toBe('grid');
        expect(Object.keys(projectsSection.variants)).toEqual(
            expect.arrayContaining(['grid', 'cards']),
        );
    });

    it.each(Object.entries(projectsSection.variants))(
        'renders the %s variant with a project title',
        (_key, variant) => {
            const Render = variant.render;
            render(
                <Render
                    data={{
                        heading: 'Projects',
                        items: [
                            { title: 'Portly', description: 'A builder', tech: 'Laravel', url: '', repo: '', image: null },
                        ],
                    }}
                />,
            );
            expect(screen.getByText('Portly')).toBeDefined();
        },
    );
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```powershell
npm run test -- projects
```

Expected: FAIL — modul `./projects` tidak ditemukan.

- [ ] **Step 3: Buat `resources/js/sections/projects.ts`**

```ts
import type { SectionDefinition } from '@/types/section';
import { ProjectsCards } from './render/projects/projects-cards';
import { ProjectsGrid } from './render/projects/projects-grid';

export interface ProjectItem {
    title: string;
    description: string;
    tech: string;
    url: string;
    repo: string;
    image: string | null;
}

export interface ProjectsData {
    heading: string;
    items: ProjectItem[];
}

const sampleItem: ProjectItem = {
    title: 'Project Title',
    description: 'What it does and why it matters.',
    tech: 'Laravel, React',
    url: '',
    repo: '',
    image: null,
};

const defaults: ProjectsData = {
    heading: 'Projects',
    items: [sampleItem],
};

function toItem(raw: unknown): ProjectItem {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        title: typeof r.title === 'string' ? r.title : sampleItem.title,
        description: typeof r.description === 'string' ? r.description : '',
        tech: typeof r.tech === 'string' ? r.tech : '',
        url: typeof r.url === 'string' ? r.url : '',
        repo: typeof r.repo === 'string' ? r.repo : '',
        image: typeof r.image === 'string' ? r.image : null,
    };
}

export function toProjectsData(raw: Record<string, unknown>): ProjectsData {
    const items = Array.isArray(raw.items) && raw.items.length > 0
        ? raw.items.map(toItem)
        : [{ ...sampleItem }];

    return {
        heading: typeof raw.heading === 'string' ? raw.heading : defaults.heading,
        items,
    };
}

export const projectsSection: SectionDefinition = {
    type: 'projects',
    label: 'Projects',
    defaults: { heading: defaults.heading, items: [{ ...sampleItem }] },
    fields: [
        { key: 'heading', type: 'text', label: 'Heading' },
        {
            key: 'items',
            type: 'list',
            label: 'Projects',
            fields: [
                { key: 'title', type: 'text', label: 'Title' },
                { key: 'description', type: 'textarea', label: 'Description' },
                { key: 'tech', type: 'text', label: 'Tech Stack' },
                { key: 'url', type: 'url', label: 'Live URL' },
                { key: 'repo', type: 'url', label: 'Repository' },
                { key: 'image', type: 'image', label: 'Image' },
            ],
        },
    ],
    variants: {
        grid: { label: 'Grid', render: ProjectsGrid },
        cards: { label: 'Cards', render: ProjectsCards },
    },
    defaultVariant: 'grid',
};
```

- [ ] **Step 4: Buat `resources/js/sections/render/projects/projects-grid.tsx`**

```tsx
import type { SectionRenderProps } from '@/types/section';
import { toProjectsData } from '@/sections/projects';

export function ProjectsGrid({ data }: SectionRenderProps) {
    const projects = toProjectsData(data);

    return (
        <div className="pf-section-inner flex flex-col gap-6">
            <h2 className="pf-heading text-3xl">{projects.heading}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.items.map((item, index) => (
                    <article key={index} className="pf-card flex flex-col gap-2">
                        <h3 className="pf-heading text-lg">{item.title}</h3>
                        {item.description ? <p className="pf-body text-sm">{item.description}</p> : null}
                        {item.tech ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                                {item.tech.split(',').map((t) => (
                                    <span key={t} className="pf-tag">{t.trim()}</span>
                                ))}
                            </div>
                        ) : null}
                    </article>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Buat `resources/js/sections/render/projects/projects-cards.tsx`**

```tsx
import type { SectionRenderProps } from '@/types/section';
import { toProjectsData } from '@/sections/projects';

export function ProjectsCards({ data }: SectionRenderProps) {
    const projects = toProjectsData(data);

    return (
        <div className="pf-section-inner flex flex-col gap-6">
            <h2 className="pf-heading text-3xl">{projects.heading}</h2>
            <div className="flex flex-col gap-4">
                {projects.items.map((item, index) => (
                    <article key={index} className="pf-card flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="pf-media aspect-video w-full shrink-0 md:w-64">
                            {item.image ? (
                                <img
                                    src={`/storage/${item.image}`}
                                    alt={item.title}
                                    className="h-full w-full rounded-[inherit] object-cover"
                                />
                            ) : null}
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="pf-heading text-xl">{item.title}</h3>
                            {item.description ? <p className="pf-body">{item.description}</p> : null}
                            <div className="flex flex-wrap gap-2">
                                {item.url ? <a href={item.url} className="pf-link text-sm">Live</a> : null}
                                {item.repo ? <a href={item.repo} className="pf-link text-sm">Code</a> : null}
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 6: Daftarkan Projects di registry**

Ubah `resources/js/sections/index.ts` menjadi:

```ts
import type { SectionDefinition } from '@/types/section';
import { aboutSection } from './about';
import { projectsSection } from './projects';

export const sectionRegistry: Record<string, SectionDefinition> = {
    [aboutSection.type]: aboutSection,
    [projectsSection.type]: projectsSection,
};

export const sectionList: SectionDefinition[] = Object.values(sectionRegistry);

export function getSectionDefinition(type: string): SectionDefinition | undefined {
    return sectionRegistry[type];
}
```

- [ ] **Step 7: Jalankan seluruh test frontend, pastikan LULUS**

```powershell
npm run test
```

Expected: seluruh test PASS. Test integritas registry di `index.test.ts` sekarang menyapu About **dan** Projects (termasuk merender tiap variant Projects dengan defaults).

- [ ] **Step 8: Commit**

```powershell
git add resources/js/sections/projects.ts resources/js/sections/render/projects resources/js/sections/projects.test.tsx resources/js/sections/index.ts
git commit -m @'
feat: add Projects section with grid and cards variants

Projects carries a list field; toProjectsData coerces each item to a
complete shape so partial or malformed entries never crash a variant.
'@
```

---

## Task 5: Halaman preview (backend + Inertia) + seeder demo

Perancah untuk melihat mesin bekerja di browser. Route dilindungi auth dan hanya pemilik yang boleh melihat — memakai ulang `PortfolioPolicy` dari Phase 0.

**Files:**
- Create: `app/Http/Controllers/PreviewController.php`, `resources/js/pages/preview.tsx`, `database/seeders/PortfolioDemoSeeder.php`
- Modify: `routes/web.php`, `resources/js/app.tsx`
- Test: `tests/Feature/PreviewControllerTest.php`

**Interfaces:**
- Consumes: `Portfolio`, `PortfolioPolicy`, `PortfolioRenderer`, `PortfolioDocument`.
- Produces: route bernama `preview` pada `GET /preview/{portfolio}`; halaman Inertia `preview` dengan prop `document`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/Feature/PreviewControllerTest.php`:

```php
<?php

use App\Models\Portfolio;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('redirects guests to login', function () {
    $portfolio = Portfolio::factory()->create();

    $this->get("/preview/{$portfolio->id}")->assertRedirect('/login');
});

it('lets the owner preview their portfolio', function () {
    $user = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create([
        'document' => [
            'version' => 1,
            'theme' => 'minimal',
            'template' => 'blank',
            'meta' => ['title' => 'Demo', 'description' => ''],
            'sections' => [],
        ],
    ]);

    $this->actingAs($user)
        ->get("/preview/{$portfolio->id}")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('preview')
            ->where('document.theme', 'minimal')
            ->has('document.sections')
        );
});

it('forbids previewing someone else\'s portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)
        ->get("/preview/{$portfolio->id}")
        ->assertForbidden();
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```powershell
php artisan test --filter=PreviewControllerTest
```

Expected: FAIL — route `/preview/...` belum ada (404, bukan redirect/200/403).

- [ ] **Step 3: Buat `app/Http/Controllers/PreviewController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PreviewController extends Controller
{
    public function __invoke(Portfolio $portfolio): Response
    {
        Gate::authorize('view', $portfolio);

        return Inertia::render('preview', [
            'document' => $portfolio->document,
        ]);
    }
}
```

`Gate::authorize` dipakai karena base `Controller` tidak memuat trait `AuthorizesRequests`. Kalau ditolak, ia melempar 403.

- [ ] **Step 4: Daftarkan route**

Di `routes/web.php`, tambahkan import dan route. Route diletakkan di dalam grup `auth` yang sudah ada bersama dashboard:

```php
use App\Http\Controllers\PreviewController;
```

Di dalam `Route::middleware(['auth', 'verified'])->group(function () { ... })`, tambahkan:

```php
    Route::get('preview/{portfolio}', PreviewController::class)->name('preview');
```

- [ ] **Step 5: Buat halaman `resources/js/pages/preview.tsx`**

```tsx
import { Head } from '@inertiajs/react';
import { PortfolioRenderer } from '@/sections/portfolio-renderer';
import type { PortfolioDocument } from '@/types/document';

export default function Preview({ document }: { document: PortfolioDocument }) {
    return (
        <>
            <Head title={document.meta.title || 'Preview'} />
            <PortfolioRenderer document={document} />
        </>
    );
}
```

- [ ] **Step 6: Render preview tanpa chrome editor**

Di `resources/js/app.tsx`, di dalam resolver `layout`, tambahkan case `preview` supaya tidak dibungkus `AppLayout`. Ubah blok `switch` sehingga baris `welcome` menjadi:

```tsx
            case name === 'welcome':
            case name === 'preview':
                return null;
```

- [ ] **Step 7: Jalankan test, pastikan LULUS**

```powershell
php artisan test --filter=PreviewControllerTest
```

Expected: 3 test PASS.

- [ ] **Step 8: Buat seeder demo `database/seeders/PortfolioDemoSeeder.php`**

Seeder membuat satu user demo dan dua portfolio yang sengaja berbeda tema **dan** variant, supaya perbedaan mesin terlihat jelas saat dicek manual.

```php
<?php

namespace Database\Seeders;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PortfolioDemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@portly.test'],
            ['name' => 'Demo User', 'password' => Hash::make('password')],
        );

        $about = fn (string $variant) => [
            'id' => 's_about',
            'type' => 'about',
            'variant' => $variant,
            'visible' => true,
            'data' => [
                'name' => 'Irfan Nuha',
                'title' => 'Fullstack Developer',
                'bio' => 'I build web apps with Laravel and React.',
                'photo' => null,
            ],
        ];

        $projects = fn (string $variant) => [
            'id' => 's_projects',
            'type' => 'projects',
            'variant' => $variant,
            'visible' => true,
            'data' => [
                'heading' => 'Projects',
                'items' => [
                    ['title' => 'Portly', 'description' => 'A portfolio website builder.', 'tech' => 'Laravel, React, Inertia', 'url' => '', 'repo' => '', 'image' => null],
                    ['title' => 'Second App', 'description' => 'Something else worth showing.', 'tech' => 'TypeScript, Tailwind', 'url' => '', 'repo' => '', 'image' => null],
                ],
            ],
        ];

        Portfolio::updateOrCreate(
            ['user_id' => $user->id, 'title' => 'Minimal Demo'],
            [
                'document' => [
                    'version' => 1,
                    'theme' => 'minimal',
                    'template' => 'developer',
                    'meta' => ['title' => 'Irfan — Minimal', 'description' => ''],
                    'sections' => [$about('image-left'), $projects('grid')],
                ],
            ],
        );

        Portfolio::updateOrCreate(
            ['user_id' => $user->id, 'title' => 'Dark Demo'],
            [
                'document' => [
                    'version' => 1,
                    'theme' => 'dark',
                    'template' => 'developer',
                    'meta' => ['title' => 'Irfan — Dark', 'description' => ''],
                    'sections' => [$about('centered'), $projects('cards')],
                ],
            ],
        );
    }
}
```

- [ ] **Step 9: Jalankan seeder dan catat id portfolio**

```powershell
php artisan db:seed --class=PortfolioDemoSeeder
php artisan tinker --execute="App\Models\Portfolio::where('title','like','%Demo')->get(['id','title'])->each(function(\$p){ echo \$p->id.' => '.\$p->title.PHP_EOL; });"
```

Expected: dua baris tercetak, misal `3 => Minimal Demo` dan `4 => Dark Demo`. Catat kedua id untuk Step 10 dan Step 5 Task 6.

- [ ] **Step 10: Commit**

```powershell
git add app/Http/Controllers/PreviewController.php resources/js/pages/preview.tsx database/seeders/PortfolioDemoSeeder.php routes/web.php resources/js/app.tsx tests/Feature/PreviewControllerTest.php
git commit -m @'
feat: add owner-only preview page and demo seeder

Render a portfolio document through PortfolioRenderer on a temporary
/preview/{portfolio} route (auth + owner-only via PortfolioPolicy). Seed
two demo portfolios that differ in theme and variant to make the engine
visible in a browser. Phase 6 replaces this with the public page.
'@
```

---

## Task 6: Gerbang kelulusan Phase 1

Phase 1 selesai hanya kalau seluruh test hijau **dan** perbedaan tema/variant terlihat nyata di browser.

**Files:** tidak ada yang dibuat — verifikasi.

- [ ] **Step 1: Seluruh test frontend**

```powershell
npm run test
```

Expected: seluruh test PASS (about, projects, index integrity, section-renderer, portfolio-renderer, empty-state dari Phase 0).

- [ ] **Step 2: Seluruh test backend**

```powershell
php artisan test
```

Expected: seluruh test PASS, termasuk `PreviewControllerTest` (3).

- [ ] **Step 3: Typecheck dan build**

```powershell
npm run types:check
npm run build
```

Expected: dua-duanya bersih.

- [ ] **Step 4: Seed ulang demo**

```powershell
php artisan db:seed --class=PortfolioDemoSeeder
```

- [ ] **Step 5: Verifikasi visual di browser**

```powershell
php artisan serve
```

Login sebagai `demo@portly.test` / `password`, lalu buka kedua URL preview (ganti id sesuai catatan Step 9 Task 5):

1. `/preview/{id-minimal}` — harus tampil About (foto kiri, teks kanan) di atas Projects (grid 3 kolom kartu), latar putih, aksen biru.
2. `/preview/{id-dark}` — About (terpusat, foto di atas) di atas Projects (kartu horizontal bertumpuk), latar hitam.

Yang harus terbukti dengan mata:
- **Tema mengubah segalanya** — dua halaman itu warna, latar, dan nuansanya jelas berbeda, padahal komponennya sama.
- **Variant mengubah tata letak** — About dan Projects tampil beda susunan di kedua halaman.

Hentikan server dengan `Ctrl+C`.

Kalau salah satu halaman tampil polos tanpa gaya (token tidak termuat), cek bahwa `@import './portfolio.css';` ada di `app.css` dan `npm run build` sudah dijalankan setelah perubahan CSS.

- [ ] **Step 6: Pastikan repo bersih**

```powershell
git status --short
```

Expected: kosong.

- [ ] **Step 7: Tandai Phase 1 selesai**

Di `docs/portly-design.md`, pada bagian "Phase 1 — Mesin Section", tambahkan baris `**Status:** Selesai <tanggal>.` dengan ringkasan hasil. Centang seluruh checkbox di rencana ini (ganti `- [ ]` jadi `- [x]` — pakai tool Edit, jangan PowerShell). Lalu commit:

```powershell
git add docs/portly-design.md docs/plans/2026-07-25-phase-1-mesin-section.md
git commit -m @'
docs: mark Phase 1 as complete
'@
```

---

## Yang Sengaja TIDAK Dikerjakan di Phase 1

| Bukan sekarang | Phase |
|---|---|
| Variant About `big-hero` & `split`, Projects `timeline` & `minimal-list` | ditambah nanti — cukup satu entri + satu komponen per variant, lebih baik dibuat setelah 5 tema ada (Phase 4) agar langsung teruji lintas tema |
| Editor, canvas, Add Section, drag & drop | 2 |
| Panel Properties, komponen field, upload gambar (field `image` kini render placeholder) | 3 |
| Tiga tema sisanya (creative, brutalist, modern) + theme hooks lanjutan | 4 |
| Sembilan section sisanya | 5 |
| Slug, publish, halaman publik `/p/{slug}`, SSR — menggantikan halaman preview | 6 |
| `DocumentValidator`/`DocumentMigrator` di sisi PHP (dokumen belum divalidasi saat simpan) | 2 |

Dua variant per section sudah cukup membuktikan yang harus dibuktikan Phase 1: registry, schema field, pergantian variant, token tema, dan class hook semuanya bekerja. Menambah variant ke-3 dst hanyalah pengulangan pola yang sama.
