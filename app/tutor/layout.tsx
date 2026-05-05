import { TutorHeader } from "@/components/tutor/tutor-header"
import { TutorSubmenu } from "@/components/tutor/tutor-submenu"

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <TutorHeader />
      <TutorSubmenu />
      {children}
    </div>
  )
}
