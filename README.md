# Annas AI Studio — AI Company Management Dashboard

Next.js 15 · TypeScript · Tailwind · Recharts · Lucide · PostgreSQL · Prisma 6

## Menjalankan

```bash
cp .env.example .env          # isi DATABASE_URL dan AUTH_SECRET
npm install
npm run setup                 # migrasi + seed 8 anggota, 5 proyek, 18 tugas
npm run dev                   # http://localhost:3000
```

Produksi: `npm run build && npm start`.

**Login seed** (password sama: `AnnasAI@2026`, ubah lewat `SEED_PASSWORD` atau menu Keamanan):
`annas@annasai.studio` (Founder), `kenji@…`, `arjun@…` (Executive), `hiroshi@…` (Manager), `meilin@…`, `minjun@…`, `aisha@…`, `wei@…` (Employee) — domain `@annasai.studio`.

## Database

18 tabel sesuai spesifikasi (+ `milestones`, `task_checklist_items`, `activity_logs`) dengan foreign key.
Skema: `prisma/schema.prisma`. SQL migrasi: `prisma/migrations/0001_init/migration.sql`.

- `npm run db:migrate` menerapkan migrasi SQL, `npm run db:seed` mengisi data awal, `npm run db:reset` mengulang dari nol.
- Setelah mengubah skema di mesin yang bisa mengunduh binary Prisma, gunakan `npx prisma migrate dev`. Di lingkungan tanpa akses ke `binaries.prisma.sh`, ubah skema lalu jalankan `npm run db:generate && npm run db:sql` (membuat ulang SQL awal; untuk perubahan lanjutan tambahkan folder migrasi SQL baru).
- Prisma dijalankan dalam mode `engineType = "client"` dengan `@prisma/adapter-pg` (tanpa binary query engine).

## Fitur

Dashboard (statistik dari data nyata), Karyawan (card/tabel, filter, CRUD, detail), Struktur organisasi interaktif, Tugas (Kanban drag & drop, tabel, kalender, list; delegasi multi-penanggung jawab, checklist, lampiran, komentar, riwayat), Proyek (milestone, tim, progress), Kolaborasi (chat per umum/proyek/divisi, @mention, instruksi → tugas, ringkasan), Laporan (harian/mingguan/bulanan, analitik, ekspor PDF & Excel), Notifikasi, Pengaturan (perusahaan, tema, role & permission, pengguna, agent AI, keamanan), **Plugin** (modul tambahan yang bisa diaktifkan).

## Sistem Plugin

Plugin didefinisikan oleh manifest di `src/lib/plugins/registry.ts` (metadata: id, nama, rute, izin, status default) dan komponen UI di `src/components/plugins/registry.tsx`. Status aktif/disimpan di tabel `plugin_settings` (migrasi `0006`). Tab **Pengaturan → Plugin** tampil untuk semua karyawan yang login; tombol aktif/nonaktif hanya tersedia untuk role dengan `settings.write` (Founder dan Executive). Menu sidebar dan rute `/plugins/[slug]` mengikuti status tersebut: plugin nonaktif membuat rutenya 404. Kode JS tidak pernah dimuat dari database — hanya manifest yang dikenal yang bisa dipasang.

Plugin bawaan pertama: **Kantor Virtual** (`/plugins/office`). Nama, jabatan, divisi, warna, dan status availability berasal dari data nyata (`/api/employees`), tetapi **seluruh gerakan dan obrolan murni simulasi visual**, bukan pemantauan karyawan nyata. Mode utama adalah ruangan 3D WebGL (three.js + React Three Fiber) berisi meja, kursi, monitor, mesin kopi, dan ruang meeting dengan 8 model generik; kaki dan lengan melangkah lewat animasi vertex shader prosedural (bukan rig/skin Meshy). Jika WebGL tidak tersedia, reduced motion aktif, atau tombol **Jeda** ditekan, plugin memakai fallback 2D (SVG + CSS + Motion) dan/atau berhenti bergerak. Model 3D sengaja generik dan tidak dibuat menyerupai wajah karyawan asli.

### Kredit aset Kantor Virtual 3D

Delapan model dibuat di [Meshy](https://www.meshy.ai/) dari gambar referensi komunitas berlisensi **CC0**. Hasil generate bermodel lisensi **CC BY 4.0** dan dikreditkan di bawah. File `.meshy` diterjemahkan ke GLB memakai [meshy2glb](https://amal-david.github.io/meshy2glb/) (MIT), lalu disimpan di `public/models/office/`. Manifest lengkap ada di `src/lib/office-models.ts`.

| Peran | Model (task Meshy) | Referensi CC0 — creator & sumber | Lisensi |
| --- | --- | --- | --- |
| Founder / CEO | `worker-01.glb` — `01a217b0-ca5d-7683-ac85-eea03f26222a` | [rayquaza.666](https://www.meshy.ai/discover/executive-man) · ref `01a03e0d-6189-7f64-854e-127fcbf26aa8` | model CC BY 4.0 · ref CC0 |
| CTO | `worker-02.glb` — `01a217bb-45bf-74ab-9155-3e8b31fe457b` | [celularbcx](https://www.meshy.ai/discover/01a19cae-312c-73ef-8b16-ae637b2cdb21) · ref `01a19cac-db5a-758d-b407-83b31d67f7bc` | model CC BY 4.0 · ref CC0 |
| COO | `worker-03.glb` — `01a217bb-f55f-7602-9bdb-96d1d26fa36e` | [truculences](https://www.meshy.ai/discover/019c9a5d-8f4d-754f-b026-ed4030f37380) · ref `019c9a32-b1b1-705d-90fa-2974812b562f` | model CC BY 4.0 · ref CC0 |
| Lead Full-Stack Developer | `worker-04.glb` — `01a217bc-23bf-746a-b0c3-ffca3d25fd3f` | [serdykee](https://www.meshy.ai/discover/019e9e35-d823-72f1-bfd3-391233fc5896) · ref `019e9e33-ee6e-77c2-94d8-5b5a65406594` | model CC BY 4.0 · ref CC0 |
| UI/UX Designer | `worker-05.glb` — `01a217bb-6cee-7763-8d1b-3391c9eb0099` | [lm2103200016](https://www.meshy.ai/discover/019e97d8-56f8-72eb-8ad2-229e85e8a0b7) · ref `019e97ca-446d-7459-a978-e89832ef0ae1` | model CC BY 4.0 · ref CC0 |
| AI Engineer | `worker-06.glb` — `01a217bc-66fe-770c-8b1d-680f02506dd3` | [playstore](https://www.meshy.ai/discover/Executive-Balance) · ref `01a00f82-634e-7312-9901-f5e61b539d14` | model CC BY 4.0 · ref CC0 |
| Data Analyst | `worker-07.glb` — `01a217bc-a87c-76b6-a6e1-68a8d547bbba` | [sujithsujith313](https://www.meshy.ai/discover/male-interviewer) · ref `70e7353b-53fb-4f91-8c94-3f41bde76d2f` | model CC BY 4.0 · ref CC0 |
| QA & Security Engineer | `worker-08.glb` — `01a217bc-d6d9-7125-b147-eccddc71a473` | [Emmett Cross](https://www.meshy.ai/discover/019f6e50-a37a-7033-9b9c-707a06cf8eb1) · ref `019f6e12-1e0b-7129-8a45-5c964d5b91da` | model CC BY 4.0 · ref CC0 |

Atribusi di atas mengikuti ketentuan CC BY 4.0 (creator, URL sumber, dan lisensi dicantumkan). Referensi CC0 tetap dicreditkan sebagai bentuk apresiasi. Lisensi: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) · [MIT](https://opensource.org/license/mit).

**Skor produktivitas** dihitung hanya dari tugas: tugas selesai tepat waktu ÷ (tugas selesai ber-deadline + tugas yang lewat deadline). Tanpa data tampil “—”.

## Integrasi AI

Tanpa API key, chat tetap berfungsi penuh (mencatat pesan, instruksi, mention, notifikasi). Untuk balasan agent dan ringkasan AI, isi di `.env`:

```
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1   # atau provider kompatibel OpenAI
```

lalu aktifkan agent di Pengaturan → Integrasi & AI. Tanpa key, endpoint mengembalikan pesan error yang jelas — tidak ada balasan palsu. Integrasi MCP belum diimplementasikan.

### Memakai OpenCode sebagai provider AI

Untuk memakai kredensial provider yang sudah tersimpan di OpenCode (tanpa menyalin API key ke proyek ini), jalankan jembatan lokal:

```bash
npm run ai:bridge       # http://127.0.0.1:4101/v1
```

`.env` sudah diarahkan ke jembatan tersebut (`OPENAI_BASE_URL=http://127.0.0.1:4101/v1`, `OPENAI_API_KEY=local-opencode-bridge`). Variabel opsional: `OPENCODE_SERVER_URL`, `OPENCODE_SERVICE_PASSWORD`, `OPENCODE_MODEL_ID`, `OPENCODE_PROVIDER_ID`, `OPENCODE_PROVIDERS`, `BRIDGE_PORT`.

**Provider & model per agent:** kolom Provider dan Model di Settings → AI Model dikirim ke jembatan dan diteruskan ke OpenCode. Isi Provider dengan ID provider OpenCode (mis. `nvidia`) dan Model dengan ID model OpenCode (mis. `meta/llama-3.2-11b-vision-instruct`). Boleh juga menulis model sebagai `nvidia/meta/llama-3.2-11b-vision-instruct` tanpa mengisi Provider. Kedelapan agent seed memakai `nvidia` + `meta/llama-3.2-11b-vision-instruct`. Model `minimaxai/minimax-m3.1-flash` suka menggantung pada prompt panjang, jadi tidak dipakai untuk crew. Ringkasan AI memakai `OPENAI_PROVIDER` + `OPENAI_MODEL` dari `.env`.

Catatan: endpoint `generate/text` OpenCode hanya menerima `prompt` dan `model`, jadi `temperature` diterjemahkan menjadi instruksi gaya di prompt (bukan sampling server), dan jembatan tidak melakukan streaming.

### Tool calling agent AI

Agent dapat memanggil tool internal lewat protokol teks `TOOL: {"name":...,"args":{...}}` (`src/lib/agent-tools.ts`), lalu aplikasi mengeksekusinya dengan Prisma dan memeriksa permission RBAC. Tool baca: `list_projects`, `list_tasks`, `get_task`, `list_employees`, `get_report_summary`, `search_workspace`. Tool tulis: `create_task`, `update_task_status` — **tidak langsung dijalankan**, agent akan menampilkan kartu konfirmasi di chat; klik **Konfirmasi** untuk mengeksekusi atau **Batal** untuk membatalkan. Token konfirmasi bertanda tangan dengan `AUTH_SECRET`, berlaku 10 menit, hanya untuk user dan percakapan yang meminta, serta sekali pakai (nonce disimpan di tabel `ai_tool_confirmations` oleh migrasi `0002`, jadi tetap aman saat server restart). Maksimal 4 putaran tool per balasan, hasil tool dipotong ~4000 karakter.

## Modul Toko (E-Commerce)

Menu **Toko** di sidebar adalah aplikasi e-commerce ringan yang berjalan di dalam website karyawan AI: katalog produk (`/shop`), pencarian/filter/sortasi, detail produk (`/shop/[slug]`), keranjang (`/shop/cart`), checkout simulasi (`/shop/checkout`), dan riwayat pesanan (`/shop/orders`). Data produk ada di `src/lib/shop-data.ts`; keranjang dan pesanan disimpan di `localStorage` browser (`ShopProvider`), sehingga tidak memerlukan tabel database, payment gateway, atau kredensial tambahan. Cocok untuk demo dan uji coba langsung di lingkungan produksi.

## Keamanan

bcrypt, cookie sesi httpOnly (JWT), pembatasan percobaan login, middleware + pemeriksaan permission per role di setiap API, validasi zod, lampiran disajikan sebagai unduhan (`nosniff`).
Catatan: pembatas login berada di memori proses (cukup untuk satu instance; gunakan Redis jika multi-instance). Lampiran disimpan di `./uploads` (gunakan object storage untuk deployment serverless seperti Vercel; VPS cocok apa adanya).

## Deployment

VPS: Node 20+, PostgreSQL, `npm run build`, `npm run db:migrate`, `npm run db:seed` (sekali), `npm start` di balik reverse proxy HTTPS. Ganti `AUTH_SECRET`.
