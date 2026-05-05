"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StudentSubmenu } from "@/components/student/student-submenu"

// Import Supabase
import { createClient } from "@/lib/supabase/client"

// Interfaces
interface Lesson {
  id: string
  dateStr: string
  dayStr: string
  timeStr: string
  tutor: string
  subject: string
  tutorImage: string
  rawDate: Date
}

interface Subscription {
  id: string
  tutor: string
  subject: string
  status: string
  lessonsInfo: string
  renewInfo: string
  tutorImage: string
}

export default function StudentHomePage() {
  const [studentName, setStudentName] = useState("Student")
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([])
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [daysUntilNext, setDaysUntilNext] = useState<number>(0)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const studentId = session.user.id

        // 1. Ambil Nama Student
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', studentId)
          .single()
        
        if (userData) {
          setStudentName(userData.full_name.split(' ')[0]) // Ambil nama depan saja
        }

        // 2. Ambil Upcoming Lessons (TAMBAHAN: tutor_id disertakan di sini)
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select(`
            id, schedule_date, start_time, end_time, status, tutor_id,
            tutor_profiles (
              subject_taught,
              users ( full_name, avatar_url )
            )
          `)
          .eq('student_id', studentId)
          .eq('status', 'Upcoming')
          .order('schedule_date', { ascending: true })
          .order('start_time', { ascending: true })

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const validUpcoming: Lesson[] = []

        lessonsData?.forEach((lesson: any) => {
          const [year, month, day] = lesson.schedule_date.split('-')
          const lessonDate = new Date(Number(year), Number(month) - 1, Number(day))
          
          if (lessonDate >= today) {
            const tutorInfo = lesson.tutor_profiles?.users
            validUpcoming.push({
              id: lesson.id,
              dateStr: lessonDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              dayStr: lessonDate.toLocaleDateString('en-US', { weekday: 'long' }),
              timeStr: `${lesson.start_time.substring(0, 5)} - ${lesson.end_time.substring(0, 5)}`,
              tutor: tutorInfo?.full_name || "Unknown Tutor",
              subject: lesson.tutor_profiles?.subject_taught || "General",
              tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
              rawDate: lessonDate
            })
          }
        })

        setUpcomingLessons(validUpcoming)

        // Set Next Lesson (Kelas paling pertama)
        if (validUpcoming.length > 0) {
          const next = validUpcoming[0]
          setNextLesson(next)
          
          // Hitung jarak hari
          const diffTime = next.rawDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          setDaysUntilNext(diffDays)
        }

        // 3. Ambil Subscriptions (TAMBAHAN: tutor_id ditarik)
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select(`
            id, status, renewal_date, tutor_id,
            tutor_profiles (
              subject_taught,
              users ( full_name, avatar_url )
            )
          `)
          .eq('student_id', studentId)

        const formattedSubs: Subscription[] = subsData?.map((sub: any) => {
          const tutorInfo = sub.tutor_profiles?.users
          const isCanceled = sub.status.toLowerCase() === 'canceled'
          
          // KUNCI PERBAIKAN: Hitung kelas yang tersisa untuk tutor ini langsung dari lessonsData
          const remainingLessons = lessonsData?.filter((lesson: any) => lesson.tutor_id === sub.tutor_id).length || 0

          // Format tanggal pembaruan jika ada
          let renewDateStr = ""
          if (sub.renewal_date) {
            const [y, m, d] = sub.renewal_date.split('-')
            const rDate = new Date(Number(y), Number(m) - 1, Number(d))
            renewDateStr = rDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          }

          return {
            id: sub.id,
            tutor: tutorInfo?.full_name || "Unknown",
            subject: sub.tutor_profiles?.subject_taught || "General",
            status: isCanceled ? "Canceled" : "Active",
            lessonsInfo: isCanceled ? "No Lessons Left" : "All Lessons Scheduled",
            // Tampilkan jumlah kelas aktif (remainingLessons)
            renewInfo: isCanceled || !renewDateStr ? "" : `Subscription To ${remainingLessons} Lessons renews Automatically On ${renewDateStr}`,
            tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
          }
        }) || []

        setSubscriptions(formattedSubs)

      } catch (error) {
        console.error("Error fetching homepage data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHomeData()
  }, [supabase])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading your dashboard...</div>
  }

  // Cari subscription yang aktif untuk ditampilkan di Weekly Notice
  const activeSub = subscriptions.find(s => s.status === "Active")

  return (
    <>
      <StudentSubmenu />
      <main className="px-6 py-8 md:px-12 max-w-5xl mx-auto">
        {/* Greeting and Next Lesson */}
        <div className="mb-8">
          <p className="text-gray-500 font-medium mb-2">Hi {studentName},</p>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h1 className="text-3xl font-bold text-[#344675]">
              {nextLesson 
                ? daysUntilNext === 0 
                  ? "Your Lesson Starts Today!" 
                  : `Your Lesson Starts In ${daysUntilNext} ${daysUntilNext === 1 ? 'Day' : 'Days'}`
                : "No Upcoming Lessons"}
            </h1>
            <Link href="/student/find-tutors">
              <Button variant="outline" className="border-[#344675] text-[#344675] hover:bg-[#d4e1f4] w-full sm:w-auto">
                Add Extra Lessons
              </Button>
            </Link>
          </div>

          {/* Next Lesson Card */}
          {nextLesson && (
            <Card className="max-w-2xl border-none shadow-md bg-white">
              <CardContent className="p-6">
                <div className="w-24 h-24 rounded-lg overflow-hidden mb-4 border">
                  <Image
                    src={nextLesson.tutorImage}
                    alt={nextLesson.tutor}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
                <p className="text-sm text-[#7492c9] font-bold mb-1">{nextLesson.dateStr}</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#344675]">
                      {nextLesson.dayStr} · {nextLesson.timeStr}
                    </h3>
                    <p className="text-gray-500 font-medium">{nextLesson.subject} With {nextLesson.tutor}</p>
                  </div>
                  <Button className="bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold">
                    {daysUntilNext === 0 ? "Join Now" : `Join In ${daysUntilNext} ${daysUntilNext === 1 ? 'Day' : 'Days'}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Lessons */}
        {upcomingLessons.length > 0 && (
          <section className="mb-8 bg-[#f4f7f9] rounded-xl p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-[#344675] mb-6">Upcoming Lessons</h2>
            <div className="space-y-4">
              {upcomingLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 pl-4 border-l-4 border-[#7492c9]"
                >
                  <div>
                    <p className="text-sm text-[#7492c9] font-bold">{lesson.dateStr}</p>
                    <p className="font-bold text-[#344675]">
                      {lesson.dayStr} · {lesson.timeStr}
                    </p>
                    <p className="text-gray-500 text-sm font-medium">{lesson.subject} With {lesson.tutor}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Weekly Notice (Ditampilkan jika ada langganan yang aktif) */}
            {activeSub && (
              <div className="mt-8 flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="w-6 h-6 rounded-full border-2 border-[#7492c9] flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 bg-[#7492c9] rounded-full" />
                </div>
                <div>
                  <p className="font-bold text-[#344675]">
                    Your Weekly Time With {activeSub.tutor} Is Reserved
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeSub.renewInfo}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Subscriptions */}
        <section>
          <h2 className="text-2xl font-bold text-[#344675] mb-6">Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-lg border border-gray-100 text-center max-w-3xl">
              You don&apos;t have any active or past subscriptions.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
              {subscriptions.map((sub) => (
                <Card key={sub.id} className="relative border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden border">
                        <Image
                          src={sub.tutorImage}
                          alt={sub.tutor}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-3 py-1 rounded-md text-xs font-bold ${
                              sub.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-[#344675] mt-4 text-lg">
                      {sub.subject} With {sub.tutor}
                    </h3>
                    <p className="text-sm text-[#344675] font-medium">{sub.lessonsInfo}</p>
                    {sub.renewInfo && (
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{sub.renewInfo}</p>
                    )}
                    <Link href="/student/find-tutors">
                      <Button
                        variant="outline"
                        className="w-full mt-6 border-[#344675] text-[#344675] hover:bg-[#d4e1f4] font-bold"
                      >
                        Add Extra Lessons
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}