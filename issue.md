# Issue: Setup Project & Database Schema

**Parent Plan:** File Upload Form Feature ([Issue #923](https://github.com/ProgrammerZamanNow/qna/issues/923))

## Objective
Inisialisasi project baru menggunakan Bun + Elysia.JS, setup Drizzle ORM dengan SQLite, lalu buat schema untuk tabel `temporary_uploads` dan `entities`.

---

## Step 1: Inisialisasi Project Bun + Elysia.JS

- Jalankan `bun init` di folder project ini untuk membuat project Bun baru.
- Install dependencies yang dibutuhkan:
  - `elysia` — web framework
  - `drizzle-orm` — ORM
  - `drizzle-kit` — migration tool untuk Drizzle
  - `better-sqlite3` — SQLite driver
- Buat file entry point `src/index.ts` yang menjalankan server Elysia di port 3000.
- Pastikan server bisa dijalankan dengan `bun run src/index.ts` dan merespons health check sederhana di `GET /`.

---

## Step 2: Setup Drizzle ORM + SQLite Connection

- Buat file `src/db/connection.ts` untuk inisialisasi koneksi SQLite menggunakan `better-sqlite3`.
  - Database file disimpan di root project, misal `database.sqlite`.
- Buat file `drizzle.config.ts` di root project untuk konfigurasi Drizzle Kit (path schema, path output migration, dialect sqlite).
- Pastikan koneksi database berhasil dijalankan saat server start.

---

## Step 3: Definisikan Database Schema

**File:** `src/db/schema.ts`

Buat dua tabel menggunakan Drizzle schema definition:

### Tabel `temporary_uploads`
| Kolom       | Tipe         | Keterangan                                      |
|-------------|--------------|--------------------------------------------------|
| id          | integer      | Primary key, autoincrement                       |
| file_id     | text         | Unique, UUID sebagai identifier file             |
| file_name   | text         | Nama asli file yang diupload                     |
| file_path   | text         | Path lokasi penyimpanan file di server            |
| file_size   | integer      | Ukuran file dalam bytes                          |
| mime_type   | text         | MIME type file (e.g. `application/pdf`)           |
| status      | text         | Status file: `pending` atau `linked`, default `pending` |
| created_at  | text         | Timestamp pembuatan record                       |

### Tabel `entities`
| Kolom       | Tipe         | Keterangan                                      |
|-------------|--------------|--------------------------------------------------|
| id          | integer      | Primary key, autoincrement                       |
| name        | text         | Nama entity                                      |
| description | text         | Deskripsi (nullable)                             |
| file_id     | text         | Referensi ke `temporary_uploads.file_id` (nullable) |
| created_at  | text         | Timestamp pembuatan record                       |

---

## Step 4: Generate & Jalankan Migration

- Jalankan `bunx drizzle-kit generate` untuk membuat file migration dari schema.
- Jalankan `bunx drizzle-kit migrate` (atau push) untuk menerapkan schema ke database SQLite.
- Verifikasi tabel `temporary_uploads` dan `entities` berhasil terbentuk di `database.sqlite`.

---

## Acceptance Criteria
- [ ] Project Bun bisa dijalankan dan server Elysia merespons di `GET /`
- [ ] Koneksi Drizzle ke SQLite berhasil
- [ ] Tabel `temporary_uploads` dan `entities` terbentuk di database dengan kolom sesuai spesifikasi
- [ ] Migration berjalan tanpa error
