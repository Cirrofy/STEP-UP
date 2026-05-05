"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const menuItems = [
  { label: "Home", href: "/student" },
  { label: "Messages", href: "/student/messages" },
  { label: "My Lessons", href: "/student/my-lessons" },
]

export function StudentSubmenu() {
  const pathname = usePathname()
  
  const isActive = (href: string) => {
    if (href === "/student") {
      return pathname === "/student"
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex gap-8 px-6 md:px-12">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "py-4 text-primary font-medium border-b-3 transition-colors",
              isActive(item.href)
                ? "border-primary"
                : "border-transparent hover:border-primary/50"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
