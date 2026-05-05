# Tugas Besar II4051 Manajemen Produk


## STEP-UP: Student Tutor Education Platform - Unified Private Tutoring
*Website* ini dikembangkan dalam rangka memenuhi Tugas Besar II4051 Manajemen Produk.

**Kelompok 1**

Anggota:
1. Stevan Einer Bonagabe / 18223028
2. Ratukhansa Salsabila / 18223034
3. Favian Rafi Laftiyanto / 18223036
4. Amudi Purba / 18223049
5. Irdina Ilmuna Yosapat / 18223060

### A. Deskripsi
STEP-UP adalah platform edukasi berbasis peer-to-peer yang dirancang untuk menghubungkan mahasiswa (Student) dengan pengajar (Tutor) secara efisien. Platform ini fokus pada kemudahan akses pembelajaran melalui sistem booking jadwal yang dinamis, transparansi biaya, dan sistem manajemen pembelajaran yang terintegrasi. STEP-UP memungkinkan penggunanya untuk mencari tutor berdasarkan keahlian spesifik dan mengelola sesi belajar melalui dashboard yang intuitif.

Layanan ini dikembangkan dengan mengintegrasikan Supabase sebagai *Backend-as-a-Service* untuk menangani autentikasi pengguna, penyimpanan data relasional, serta manajemen file gambar.

### B. Fitur Utama
1. **Smart Tutor Discovery**: Fitur pencarian dan filter tutor berdasarkan subjek (Matematika, Fisika, Coding, dll), tingkat pendidikan, dan rating rata-rata yang akurat (rating 1-5).
2. **Flexible Booking & Subscription**: Pengguna dapat melakukan *booking* satu pertemuan atau berlangganan paket *1-Month Subscription* yang secara otomatis menjadwalkan 4 pertemuan mingguan dalam satu kali transaksi.
3. **Real-time Dashboard**: Dashboard tutor yang dapat digunakan untuk melacak Balance (saldo) dan Estimated Earnings (pendapatan hari ini, 7 hari terakhir, dan 30 hari terakhir) berdasarkan transaksi yang berhasil, serta mengetahui kelas berikutnya yang harus diajar. Sedangkan *dashboard* student digunakan untuk memantau jadwal tutor berikutnya, serta melihat informasi *renewal subscription*
4. **Verified Review System**: Sistem ulasan di mana satu pengajar hanya dapat diulas satu kali oleh satu murid untuk menjaga integritas ulasan.
5. **Dynamic Availability Calendar**: Kalender ketersediaan tutor yang interaktif, mencegah double booking, dan secara otomatis menyembunyikan jadwal yang sudah lewat (passed slots).
6. **Direct Messaging**: Fitur komunikasi langsung antara Student dan Tutor untuk mendiskusikan materi maupun hal-hal lain yang berkaitan dengan tutor.
7. **Customizable Profile**: Tutor dapat mengatur profilnya, mulai dari subjek yang diajar, pengalaman mengajar, informasi akademik, biografi, biaya mengajar per jam hingga memilih jadwal mengajar.

### C. Technology Stack yang Digunakan
- ***Frontend***: Next.js 15, TypeScript, Tailwind CSS.
- ***UI Components***: Shadcn UI, Lucide React (Icons).
- ***Backend & Database***: Supabase (PostgreSQL) untuk penyimpanan data Tutor, Student, Lessons, dan Subscriptions.
- ***Authentication***: Supabase Auth (Email & Password).
- ***Storage***: Supabase Storage untuk manajemen avatar profil pengguna.

### D. Screenshot Website

#### Landing Page
#### Register Page
#### Login Page
#### Choose Subject
#### Find Tutor + Filter Search
#### Tutor Detailed Profile
#### Booking Pop-Up
#### Payment Page
#### Student Homepage
#### Student Messages Page
#### Student Edit Profile
#### Review Pop-Up
#### Tutor Homepage
#### Tutor Messages Page
#### Tutor My Lessons Page
#### Tutor Edit Profile