"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { StepUpLogo } from "@/components/step-up-logo"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

export function TutorHeader() {
  const pathname = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string>("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop") // Default avatar
  
  const supabase = createClient()

  useEffect(() => {
    const fetchUserAvatar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: userData } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single()

        if (userData?.avatar_url) {
          setAvatarUrl(userData.avatar_url)
        }
      } catch (error) {
        console.error("Error fetching user avatar:", error)
      }
    }

    fetchUserAvatar()
  }, [supabase])

  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-4 md:px-12">
        <StepUpLogo />

        <nav className="flex items-center gap-8">
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Log Out
          </Link>
          <Link
            href="/tutor"
            className={cn(
              "font-medium transition-colors",
              pathname.startsWith("/tutor") && !pathname.includes("/edit-profile")
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Home
          </Link>
          <Link href="/tutor/messages">
            <MessageSquare className="w-6 h-6 text-primary hover:text-primary/80 transition-colors" />
          </Link>
          <Link href="/tutor/edit-profile">
            {/* Diubah menjadi rounded-full agar melingkar, dengan ukuran w-12 h-12 yang konsisten */}
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-sm">
              <Image
                src={avatarUrl}
                alt="Profile"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
          </Link>
        </nav>
      </div>
    </header>
  )
}