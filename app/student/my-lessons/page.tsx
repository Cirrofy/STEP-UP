"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StudentSubmenu } from "@/components/student/student-submenu"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"

// Interfaces untuk TypeScript
interface LessonData {
  id: string
  date: string
  day: string
  time: string
  tutor: string
  subject: string
  completed: boolean
  tutorImage: string
}

interface SubscriptionData {
  id: string
  name: string
  subject: string
  lessonsToSchedule: number
  pricePerLesson: number
  status: string
  tutorImage: string
}

export default function MyLessonsPage() {
  const [activeTab, setActiveTab] = useState<"lessons" | "tutors">("lessons")
  
  // States untuk data dinamis
  const [upcomingLessons, setUpcomingLessons] = useState<LessonData[]>([])
  const [weekdayLessons, setWeekdayLessons] = useState<LessonData[]>([])
  const [pastLessons, setPastLessons] = useState<LessonData[]>([])
  const [tutorSubscriptions, setTutorSubscriptions] = useState<SubscriptionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const studentId = session.user.id

        // 1. Fetch Data Lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            id, schedule_date, start_time, end_time, status,
            tutor_profiles (
              subject_taught,
              users ( full_name, avatar_url )
            )
          `)
          .eq('student_id', studentId)
          .order('schedule_date', { ascending: true })

        if (lessonsError) throw lessonsError

        // 2. Fetch Data Subscriptions (Tab Tutors)
        const { data: subsData, error: subsError } = await supabase
          .from('subscriptions')
          .select(`
            id, status, lessons_left,
            tutor_profiles (
              price_per_hour, subject_taught,
              users ( full_name, avatar_url )
            )
          `)
          .eq('student_id', studentId)

        if (subsError) throw subsError

        // --- PROSES DATA LESSONS ---
        const upcoming: LessonData[] = []
        const past: LessonData[] = []
        const weekdayMap = new Map<string, LessonData>()

        const today = new Date()
        today.setHours(0, 0, 0, 0) // Nol-kan jam agar perbandingan tanggal akurat

        lessonsData?.forEach((lesson: any) => {
          // Parsing tanggal dengan aman
          const [year, month, day] = lesson.schedule_date.split('-')
          const lessonDate = new Date(Number(year), Number(month) - 1, Number(day))
          
          const dateStr = lessonDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
          const dayStr = lessonDate.toLocaleDateString('en-US', { weekday: 'long' })
          const timeStr = `${lesson.start_time.substring(0, 5)} - ${lesson.end_time.substring(0, 5)}`
          
          // Mengambil data relasi dari tutor_profiles -> users
          const tutorInfo = lesson.tutor_profiles?.users
          const subjectTaught = lesson.tutor_profiles?.subject_taught || "General"

          const formattedLesson: LessonData = {
            id: lesson.id,
            date: dateStr,
            day: dayStr,
            time: timeStr,
            tutor: tutorInfo?.full_name || "Unknown Tutor",
            subject: subjectTaught,
            completed: lesson.status === 'Completed',
            tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
          }

          if (lessonDate >= today && lesson.status === 'Upcoming') {
            upcoming.push(formattedLesson)
            
            // Pola untuk Weekday Lesson
            const uniqueKey = `${formattedLesson.day}-${formattedLesson.time}-${formattedLesson.tutor}`
            if (!weekdayMap.has(uniqueKey)) {
              weekdayMap.set(uniqueKey, formattedLesson)
            }
          } else {
            past.push({ ...formattedLesson, completed: true })
          }
        })

        // --- PROSES DATA SUBSCRIPTIONS ---
        const formattedSubs: SubscriptionData[] = subsData?.map((sub: any) => {
          const tutorInfo = sub.tutor_profiles?.users
          return {
            id: sub.id,
            name: tutorInfo?.full_name || "Unknown Tutor",
            subject: sub.tutor_profiles?.subject_taught || "General",
            lessonsToSchedule: sub.lessons_left || 0,
            pricePerLesson: Number(sub.tutor_profiles?.price_per_hour || 0),
            status: sub.status.toLowerCase(), // 'active' atau 'canceled'
            tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
          }
        }) || []

        setUpcomingLessons(upcoming)
        setPastLessons(past.reverse())
        setWeekdayLessons(Array.from(weekdayMap.values()))
        setTutorSubscriptions(formattedSubs)

      } catch (error) {
        console.error("Error fetching student lessons:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  return (
    <>
      <StudentSubmenu />
      <main className="px-6 py-8 md:px-12 max-w-5xl mx-auto">
        {/* Header */}
        <Link href="/student/find-tutors">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#344675]">My Lessons</h1>
          <Button variant="outline" className="border-[#344675] text-[#344675] hover:bg-[#d4e1f4]">
            Add Extra Lessons
          </Button>
        </div>
        </Link>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab("lessons")}
            className={cn(
              "pb-3 font-bold transition-colors border-b-2",
              activeTab === "lessons"
                ? "text-[#7492c9] border-[#7492c9]"
                : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            Lessons
          </button>
          <button
            onClick={() => setActiveTab("tutors")}
            className={cn(
              "pb-3 font-bold transition-colors border-b-2",
              activeTab === "tutors"
                ? "text-[#7492c9] border-[#7492c9]"
                : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            Tutors
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#344675] font-bold">Loading your data...</div>
        ) : activeTab === "lessons" ? (
          <>
            {/* Upcoming Lessons */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-[#344675] mb-4">Upcoming Lessons</h2>
              {upcomingLessons.length === 0 ? (
                <p className="text-gray-500 bg-white p-4 rounded-lg border border-gray-100 text-center">No upcoming lessons.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingLessons.map((lesson) => (
                    <Card key={lesson.id} className="border-none shadow-sm">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border">
                          <Image
                            src={lesson.tutorImage}
                            alt={lesson.tutor}
                            width={56} height={56}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-[#344675]">
                            {lesson.day}, {lesson.date} · {lesson.time}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {lesson.tutor}, {lesson.subject}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Weekday Lesson */}
            {weekdayLessons.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold text-[#344675] mb-4">Weekday Lesson</h2>
                <div className="space-y-3">
                  {weekdayLessons.map((lesson, idx) => (
                    <Card key={`week-${idx}`} className="border-none shadow-sm">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border">
                          <Image
                            src={lesson.tutorImage}
                            alt={lesson.tutor}
                            width={56} height={56}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#7492c9] mb-4" />
                          <div>
                            <p className="font-bold text-[#344675]">
                              Every {lesson.day} · {lesson.time}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              {lesson.tutor}, {lesson.subject}
                            </p>
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
              <h2 className="text-xl font-bold text-[#344675] mb-4">Past Lessons</h2>
              {pastLessons.length === 0 ? (
                <p className="text-gray-500 bg-white p-4 rounded-lg border border-gray-100 text-center">No past lessons.</p>
              ) : (
                <div className="space-y-3">
                  {pastLessons.map((lesson) => (
                    <Card key={lesson.id} className="border-none shadow-sm bg-gray-50/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border opacity-80">
                          <Image
                            src={lesson.tutorImage}
                            alt={lesson.tutor}
                            width={56} height={56}
                            className="object-cover w-full h-full grayscale-[20%]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {lesson.completed && (
                            <Check className="w-5 h-5 text-green-500 mb-4" />
                          )}
                          <div>
                            <p className="font-bold text-[#344675] opacity-80">
                              {lesson.day}, {lesson.date} · {lesson.time}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              {lesson.tutor}, {lesson.subject}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* Tutors Tab */
          <section>
            {tutorSubscriptions.length === 0 ? (
              <p className="text-gray-500 bg-white p-4 rounded-lg border border-gray-100 text-center max-w-3xl">You haven&apos;t subscribed to any tutors yet.</p>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {tutorSubscriptions.map((tutor) => (
                  <Card key={tutor.id} className="border-none shadow-sm">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border shrink-0">
                        <Image
                          src={tutor.tutorImage}
                          alt={tutor.name}
                          width={80} height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1 mt-2 sm:mt-0">
                        <h3 className="font-bold text-[#344675] text-xl">{tutor.name}</h3>
                        <p className="text-[#7492c9] font-medium">{tutor.subject}</p>
                      </div>
                      
                      <div className="flex flex-row gap-8 sm:gap-12 mt-4 sm:mt-0 items-center">
                        <div className="text-center">
                          <p className="font-bold text-[#344675] text-lg">{tutor.lessonsToSchedule} Lessons</p>
                          <p className="text-sm text-gray-500 font-medium">To Schedule</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-[#344675] text-lg">€{tutor.pricePerLesson.toFixed(2)}</p>
                          <p className="text-sm text-gray-500 font-medium">Per Lesson</p>
                        </div>
                        
                        {tutor.status === "canceled" && (
                          <div className="text-center sm:pl-4 sm:border-l border-gray-200">
                            <p className="text-red-500 text-sm font-bold mb-2">Subscription<br/>Cancelled</p>
                            <Button variant="outline" className="border-[#344675] text-[#344675] hover:bg-[#d4e1f4] h-8 text-xs">
                              Resubscribe
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </>
  )
}