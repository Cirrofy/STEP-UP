"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

// Pastikan import logoImg Anda tetap sesuai dengan path file gambar Anda
import logoImg from "./step-up-logo.png" 

interface StepUpLogoProps {
  className?: string
}

export function StepUpLogo({ className = "" }: StepUpLogoProps) {
  const pathname = usePathname()

  // 1. Jika pengguna sedang di Landing Page, jangan gunakan <Link>
  //    agar benar-benar tidak mengarahkan kemana-mana / tidak refresh.
  if (pathname === "/") {
    return (
      <div className={`inline-block ${className}`}>
        <Image
          src={logoImg}
          alt="STEP-UP Logo"
          width={200}
          height={66}
          className="w-auto h-10 object-contain drop-shadow-sm"
          priority
        />
      </div>
    )
  }

  // 2. Menentukan target URL berdasarkan path saat ini
  let targetHref = "/" // Default ke root
  
  if (pathname.startsWith("/student")) {
    targetHref = "/student"
  } else if (pathname.startsWith("/tutor")) {
    targetHref = "/tutor"
  }

  // 3. Render dengan Link untuk halaman lainnya
  return (
    <Link href={targetHref} className={`inline-block ${className}`}>
      <Image
        src={logoImg}
        alt="STEP-UP Logo"
        width={200}
        height={66}
        className="w-auto h-10 object-contain drop-shadow-sm"
        priority
      />
    </Link>
  )
}