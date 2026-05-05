/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memberitahu Next.js untuk mengekspor menjadi file statis (HTML/CSS/JS)
  output: 'export',
  
  // Matikan optimasi gambar bawaan Next.js karena butuh server Node.js
  images: {
    unoptimized: true,
  },

  // WAJIB: Sesuaikan dengan nama repositori GitHub kamu.
  // Misalnya nama repo kamu adalah "STEP-UP", gunakan '/STEP-UP'
  // Jika ini adalah repo profil (username.github.io), hapus baris basePath ini.
  basePath: '/STEP-UP',
  
  // Menonaktifkan x-powered-by header (opsional tapi disarankan)
  poweredByHeader: false,
};

module.exports = nextConfig;

export default nextConfig
