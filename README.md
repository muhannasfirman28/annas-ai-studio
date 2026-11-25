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

Dashboard (statistik dari data nyata), Karyawan (card/tabel, filter, CRUD, detail), Struktur organisasi interaktif, Tugas (Kanban drag & drop, tabel, kalender, list; delegasi multi-penanggung jawab, checklist, lampiran, komentar, riwayat), Proyek (milestone, tim, progress), Kolaborasi (chat per umum/proyek/divisi, @mention, instruksi → tugas, ringkasan), Laporan (harian/mingguan/bulanan, analitik, ekspor PDF & Excel), Notifikasi, Pengaturan (perusahaan, tema, role & permission, pengguna, agent AI, keamanan).

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
