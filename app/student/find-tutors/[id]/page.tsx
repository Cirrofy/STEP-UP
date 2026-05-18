// File: app/student/find-tutors/[id]/page.tsx

import TutorClient from './tutor-client'

export default function TutorProfilePage() {
  // Panggil komponen UI secara langsung tanpa dikunci oleh generateStaticParams
  return <TutorClient />
}