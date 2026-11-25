/** Katalog toko internal Annas AI Studio. Data lokal — tidak memerlukan database atau payment gateway. */

export type Category = "Digital" | "Apparel" | "Aksesoris";
export type Product = {
  slug: string;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  rating: number;
  sold: number;
  emoji: string;
  colors: [string, string];
  badge?: string;
  description: string;
  highlights: string[];
};

export const CATEGORIES: ("Semua" | Category)[] = ["Semua", "Digital", "Apparel", "Aksesoris"];

export const PRODUCTS: Product[] = [
  {
    slug: "ai-workflow-kit", name: "AI Workflow Kit", category: "Digital", price: 149000, oldPrice: 199000,
    rating: 4.9, sold: 324, emoji: "🧩", colors: ["#2563eb", "#7c3aed"], badge: "Terlaris",
    description: "Kumpulan 24 template alur kerja AI untuk riset, produksi konten, dan operasional tim. Siap pakai di tools favoritmu.",
    highlights: ["24 template alur kerja", "Panduan implementasi 40 halaman", "Update gratis selama 1 tahun"],
  },
  {
    slug: "prompt-playbook", name: "Prompt Playbook 2026", category: "Digital", price: 99000,
    rating: 4.8, sold: 218, emoji: "📘", colors: ["#0ea5e9", "#2563eb"],
    description: "Buku prompt praktis untuk agent AI: riset, penulisan, analisis data, dan otomasi tugas harian.",
    highlights: ["180+ prompt teruji", "Teknik tool calling", "Studi kasus tim produk"],
  },
  {
    slug: "brand-kit-pro", name: "Brand Kit Pro", category: "Digital", price: 249000, oldPrice: 299000,
    rating: 4.9, sold: 156, emoji: "🎨", colors: ["#7c3aed", "#db2777"], badge: "Baru",
    description: "Sistem identitas brand lengkap: logo, palet warna, tipografi, dan 30 template materi marketing.",
    highlights: ["30 template canva & figma", "Panduan brand voice", "File vektor sumber"],
  },
  {
    slug: "meeting-notes-template", name: "Template Notulen Rapat", category: "Digital", price: 59000,
    rating: 4.7, sold: 412, emoji: "🗒️", colors: ["#0891b2", "#22c55e"],
    description: "Format notulen rapat yang ringkas dan konsisten, lengkap dengan pelacakan keputusan dan tindak lanjut.",
    highlights: ["Format harian & mingguan", "Kolom keputusan + PIC", "Kompatibel dengan tools AI"],
  },
  {
    slug: "kaos-annas-ai", name: "Kaos Annas AI", category: "Apparel", price: 159000,
    rating: 4.8, sold: 187, emoji: "👕", colors: ["#1e293b", "#2563eb"], badge: "Favorit",
    description: "Kaos katun combed 30s dengan cetakan logo Annas AI Studio. Nyaman dipakai seharian.",
    highlights: ["Katun combed 30s", "Sablon tahan cuci", "Ukuran S–XXL"],
  },
  {
    slug: "hoodie-studio", name: "Hoodie Studio", category: "Apparel", price: 329000, oldPrice: 379000,
    rating: 4.9, sold: 94, emoji: "🧥", colors: ["#334155", "#0ea5e9"],
    description: "Hoodie premium dengan potongan oversized dan bordir halus. Cocok untuk kerja remote maupun acara tim.",
    highlights: ["Bahan fleece premium", "Potongan unisex", "Bordir eksklusif"],
  },
  {
    slug: "tote-bag-kanvas", name: "Tote Bag Kanvas", category: "Apparel", price: 119000,
    rating: 4.6, sold: 265, emoji: "👜", colors: ["#d97706", "#f59e0b"],
    description: "Tote bag kanvas tebal dengan tali kuat. Muat laptop 14 inci dan perlengkapan harian.",
    highlights: ["Kanvas 12 oz", "Saku dalam", "Cetak dua sisi"],
  },
  {
    slug: "topi-merch", name: "Topi Merch Studio", category: "Apparel", price: 99000,
    rating: 4.5, sold: 132, emoji: "🧢", colors: ["#0f172a", "#3b82f6"],
    description: "Topi trucker dengan logo bordir dan tali adjustable. Aksesoris sederhana untuk identitas tim.",
    highlights: ["Bordir logo", "Tali adjustable", "Mesh ringan"],
  },
  {
    slug: "desk-mat-premium", name: "Desk Mat Premium", category: "Aksesoris", price: 189000,
    rating: 4.8, sold: 143, emoji: "🖱️", colors: ["#0f766e", "#06b6d4"], badge: "Terlaris",
    description: "Alas meja besar dengan permukaan halus dan pinggiran jahit. Ideal untuk workstation minimalis.",
    highlights: ["Ukuran 90×40 cm", "Anti-slip", "Permukaan water-resistant"],
  },
  {
    slug: "sticker-pack-ai", name: "Sticker Pack AI", category: "Aksesoris", price: 39000,
    rating: 4.7, sold: 508, emoji: "✨", colors: ["#db2777", "#f97316"],
    description: "Paket 20 stiker vinyl dengan tema AI, agent, dan budaya kerja studio. Awet dan anti air.",
    highlights: ["20 desain unik", "Vinyl anti air", "Ukuran 4–7 cm"],
  },
  {
    slug: "tumbler-studio", name: "Tumbler Studio", category: "Aksesoris", price: 139000,
    rating: 4.8, sold: 201, emoji: "🥤", colors: ["#0369a1", "#38bdf8"],
    description: "Tumbler stainless 600 ml dengan logo tim. Menjaga minuman tetap dingin atau hangat lebih lama.",
    highlights: ["Kapasitas 600 ml", "Stainless food grade", "Tutup anti tumpah"],
  },
  {
    slug: "notebook-dot-grid", name: "Notebook Dot Grid", category: "Aksesoris", price: 79000,
    rating: 4.6, sold: 176, emoji: "📓", colors: ["#7c2d12", "#ea580c"],
    description: "Buku catatan dot grid 160 halaman dengan cover keras. Tempat yang pas untuk ide dan sketsa produk.",
    highlights: ["160 halaman dot grid", "Cover keras", "Jahitan layflat"],
  },
];

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export type ShippingMethod = "reguler" | "kilat";
export const SHIPPING: Record<ShippingMethod, { label: string; price: number; eta: string }> = {
  reguler: { label: "Reguler (3–5 hari)", price: 15000, eta: "3–5 hari kerja" },
  kilat: { label: "Kilat (1–2 hari)", price: 32000, eta: "1–2 hari kerja" },
};
