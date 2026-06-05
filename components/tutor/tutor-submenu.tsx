"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const menuItems = [
  { label: "Home", href: "/tutor" },
  { label: "Messages", href: "/tutor/messages" },
  { label: "My Lessons", href: "/tutor/my-lessons" },
  { label: "Materials", href: "/tutor/materials" },
]

export function TutorSubmenu() {
  const pathname = usePathname()

  // Don't show submenu on edit profile page
  if (pathname.includes("/edit-profile")) {
    return null
  }

  return (
    <nav className="border-b border-border px-6 md:px-12">
      <div className="flex gap-8">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/tutor" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "py-3 font-medium border-b-2 transition-colors",
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-primary"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}