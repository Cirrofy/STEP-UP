"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Check, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

import { createClient } from "@/lib/supabase/client"

// Interface untuk membantu TypeScript mengenali bentuk data
interface LessonData {
  id: string
  date: string
  dayOfWeek: string
  time: string
  student: string
  subject: string
  completed: boolean
  image: string
}

export default function TutorMyLessonsPage() {
  const [upcomingLessons, setUpcomingLessons] = useState<LessonData[]>([])
  const [weekdayLessons, setWeekdayLessons] = useState<LessonData[]>([])
  const [pastLessons, setPastLessons] = useState<LessonData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true)
      try {
        // 1. Dapatkan sesi user (Tutor) yang sedang login
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // 2. Dapatkan Profile ID dari tutor ini (karena tabel lessons butuh tutor_id)
        const { data: profile } = await supabase
          .from('tutor_profiles')
          .select('id, subject_taught')
          .eq('user_id', session.user.id)
          .single()

        if (!profile) throw new Error("Tutor profile not found")

        // 3. Tarik semua jadwal kelas untuk tutor ini
        const { data: lessons, error } = await supabase
          .from('lessons')
          .select(`
            id,
            schedule_date,
            start_time,
            end_time,
            status,
            users ( full_name, avatar_url )
          `)
          .eq('tutor_id', profile.id)
          .order('schedule_date', { ascending: true })

        if (error) throw error

        const upcoming: LessonData[] = []
        const past: LessonData[] = []
        const weekdayMap = new Map<string, LessonData>() // Untuk mencari jadwal unik

        // Dapatkan tanggal hari ini (jam dinolkan agar perbandingan tanggal akurat)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 4. Format & Kelompokkan Data
        lessons?.forEach((lesson: any) => {
          // Parsing tanggal aman (mencegah bug timezone UTC)
          const [year, month, day] = lesson.schedule_date.split('-')
          const lessonDate = new Date(Number(year), Number(month) - 1, Number(day))
          
          // Format Date UI
          const dateStr = lessonDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
          const dayOfWeekStr = lessonDate.toLocaleDateString('en-US', { weekday: 'long' })
          
          // Format Time UI ("18:00:00" -> "18:00")
          const formatTime = (t: string) => t.substring(0, 5)
          const timeStr = `${formatTime(lesson.start_time)} - ${formatTime(lesson.end_time)}`

          const formattedLesson: LessonData = {
            id: lesson.id,
            date: dateStr,
            dayOfWeek: dayOfWeekStr,
            time: timeStr,
            student: lesson.users?.full_name || "Unknown Student",
            subject: profile.subject_taught || "General",
            completed: lesson.status === 'Completed',
            image: lesson.users?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop"
          }

          // Logika Pemisahan Upcoming vs Past
          if (lessonDate >= today && lesson.status === 'Upcoming') {
            upcoming.push(formattedLesson)
            
            // Simpan pola jadwal unik untuk dirender di tab "Weekday Lesson"
            const uniqueKey = `${formattedLesson.dayOfWeek}-${formattedLesson.time}-${formattedLesson.student}`
            if (!weekdayMap.has(uniqueKey)) {
              weekdayMap.set(uniqueKey, formattedLesson)
            }
          } else {
            past.push({ ...formattedLesson, completed: true }) // Anggap lewat = completed di UI ini
          }
        })

        setUpcomingLessons(upcoming)
        setPastLessons(past.reverse()) // Reverse agar yang paling baru lewat ada di atas
        setWeekdayLessons(Array.from(weekdayMap.values()))

      } catch (error) {
        console.error("Error fetching lessons:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLessons()
  }, [supabase])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading Lessons...</div>
  }

  return (
    <main className="px-6 py-8 md:px-12 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">My Lessons</h1>
      
      {/* Tab Indicator */}
      <div className="flex gap-8 mb-6">
        <div className="border-b-2 border-primary pb-2">
          <span className="font-medium text-primary">Lessons</span>
        </div>
      </div>

      {/* Upcoming Lessons */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-primary mb-4">Upcoming Lessons</h2>
        {upcomingLessons.length === 0 ? (
          <p className="text-muted-foreground bg-card p-4 rounded-lg border border-border text-center">No upcoming lessons scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcomingLessons.map((lesson) => (
              <Card key={lesson.id} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
                      <Image
                        src={lesson.image}
                        alt={lesson.student}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-[#344675]">
                        {lesson.dayOfWeek}, {lesson.date} · {lesson.time}
                      </p>
                      <p className="text-sm text-gray-500 font-medium mt-1">
                        {lesson.student}, {lesson.subject}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Weekday Lessons (Schedules) */}
      {weekdayLessons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-primary mb-4">Weekday Lesson</h2>
          <div className="space-y-3">
            {weekdayLessons.map((lesson) => (
              <Card key={`weekday-${lesson.id}`} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
                      <Image
                        src={lesson.image}
                        alt={lesson.student}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#7492c9] mb-4" />
                      <div>
                        <p className="font-bold text-[#344675]">
                          Every {lesson.dayOfWeek} · {lesson.time}
                        </p>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                          {lesson.student}, {lesson.subject}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Past Lessons */}
      <section>
        <h2 className="text-xl font-bold text-primary mb-4">Past Lessons</h2>
        {pastLessons.length === 0 ? (
          <p className="text-muted-foreground bg-card p-4 rounded-lg border border-border text-center">No past lessons recorded.</p>
        ) : (
          <div className="space-y-3">
            {pastLessons.map((lesson) => (
              <Card key={lesson.id} className="border-none shadow-sm bg-gray-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 opacity-80">
                      <Image
                        src={lesson.image}
                        alt={lesson.student}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full grayscale-[20%]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {lesson.completed && (
                        <Check className="w-5 h-5 text-green-500 mb-4" />
                      )}
                      <div>
                        <p className="font-bold text-[#344675] opacity-80">
                          {lesson.dayOfWeek}, {lesson.date} · {lesson.time}
                        </p>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                          {lesson.student}, {lesson.subject}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}