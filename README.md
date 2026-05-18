# Tugas Besar II4051 Manajemen Produk

<img width="927" height="360" alt="image" src="https://github.com/user-attachments/assets/553ed724-2ef4-4259-88d8-2bee543916a1" />

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

Layanan ini dikembangkan dengan mengintegrasikan Supabase sebagai *Backend-as-a-Service* untuk menangani autentikasi pengguna, penyimpanan data relasional, serta manajemen file gambar. Adapun *website* ini dibuat dengan bantuan AI v0 by vercel untuk *Frontend* dan Gemini Pro untuk algoritma dan *debugging*. 

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
<img width="1899" height="908" alt="image" src="https://github.com/user-attachments/assets/40954118-1236-4965-a649-e47096525c7c" />

#### Register Page
<img width="1897" height="908" alt="image" src="https://github.com/user-attachments/assets/615fc33a-92ca-47d5-a412-98267d9dee3f" />

#### Login Page
<img width="1896" height="900" alt="image" src="https://github.com/user-attachments/assets/6b5ced39-d111-4ad9-aee8-ace1fe04c936" />

#### Choose Subject
<img width="1902" height="908" alt="image" src="https://github.com/user-attachments/assets/b992a838-424f-4409-a194-2254344d0258" />

#### Find Tutor + Filter Search
<img width="1900" height="908" alt="image" src="https://github.com/user-attachments/assets/db0ec9e6-dfb7-4481-a8ca-8970f254194f" />

#### Tutor Detailed Profile
<img width="1898" height="907" alt="image" src="https://github.com/user-attachments/assets/badb7837-5f46-4fad-8e2e-0aff34e26d5a" />
<img width="1899" height="909" alt="image" src="https://github.com/user-attachments/assets/5ac90680-7248-43ee-8db3-e710135bbf67" />

#### Booking Pop-Up
<img width="1898" height="906" alt="image" src="https://github.com/user-attachments/assets/6f97ed2c-a8f6-463e-a424-478c8f0ad54f" />

#### Payment Page
<img width="1897" height="905" alt="image" src="https://github.com/user-attachments/assets/8467bcd1-f728-4eba-a009-d2fae46b7e11" />

#### Student Homepage
<img width="1898" height="911" alt="image" src="https://github.com/user-attachments/assets/7b208fde-22ed-413a-88e0-31a5f44bb01c" />

#### Student Messages Page
<img width="1919" height="905" alt="image" src="https://github.com/user-attachments/assets/9f2cf856-f596-477c-b378-a4bc155169ad" />

#### Student Edit Profile
<img width="1899" height="907" alt="image" src="https://github.com/user-attachments/assets/093c79d6-3cb0-4af3-9d15-b865629d3661" />

#### Review Pop-Up
<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/e19bb613-ecc4-47fd-8afe-6389ac990810" />

#### Tutor Homepage
<img width="1899" height="909" alt="image" src="https://github.com/user-attachments/assets/dc3845e3-9da0-4cc9-a86d-52025355dd10" />
<img width="1896" height="908" alt="image" src="https://github.com/user-attachments/assets/fa71a18a-871c-46ab-bdd9-2a9decd5f807" />

#### Tutor Messages Page
<img width="1900" height="904" alt="image" src="https://github.com/user-attachments/assets/8bbfcdab-5ae6-4b0c-a947-423b92763ee3" />

#### Tutor My Lessons Page
<img width="1898" height="907" alt="image" src="https://github.com/user-attachments/assets/bca10525-49d0-44e1-8e84-1899c2a56393" />

#### Tutor Edit Profile
<img width="1896" height="909" alt="image" src="https://github.com/user-attachments/assets/ee3784ab-cb58-4800-8376-85fdda953447" />
<img width="1898" height="909" alt="image" src="https://github.com/user-attachments/assets/d86a2093-574b-4d58-9e5a-1e8afd3d8487" />
<img width="1896" height="912" alt="image" src="https://github.com/user-attachments/assets/1172c1fc-8733-42c3-a1e7-b2f4fe8be154" />


