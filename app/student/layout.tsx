import { StudentHeader } from "@/components/student/student-header"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      {children}
    </div>
  )
}
