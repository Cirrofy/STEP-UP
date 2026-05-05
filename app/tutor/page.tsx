"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

interface Lesson {
  id: string
  dateStr: string
  dayOfWeek: string
  timeStr: string
  studentName: string
  subject: string
  image: string
  rawDate: Date
}

interface StudentSub {
  id: string
  name: string
  subject: string
  status: string
  renewDate: string
  image: string
}

interface Earnings {
  today: number
  last7Days: number
  last30Days: number
  balance: number
  lastWithdrawal: number
}

export default function TutorHomePage() {
  const router = useRouter()
  const [tutorName, setTutorName] = useState("Tutor")
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<StudentSub[]>([])
  const [earnings, setEarnings] = useState<Earnings>({
    today: 0, last7Days: 0, last30Days: 0, balance: 0, lastWithdrawal: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const userId = session.user.id

        // 1. Ambil Nama Tutor
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', userId)
          .single()
        
        if (userData) {
          setTutorName(userData.full_name.split(' ')[0])
        }

        // 2. Ambil Profile Tutor
        const { data: profile } = await supabase
          .from('tutor_profiles')
          .select('id, subject_taught, balance, price_per_hour')
          .eq('user_id', userId)
          .maybeSingle()

        if (!profile || !profile.subject_taught || !profile.price_per_hour) {
          router.push('/tutor/edit-profile?setup=true')
          return
        }

        // 3. Ambil Lessons (Dilengkapi dengan lessonsError dan created_at)
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            id, schedule_date, start_time, end_time, status, total_price, student_id, created_at,
            student:users!student_id ( full_name, avatar_url )
          `)
          .eq('tutor_id', profile.id)
          .order('schedule_date', { ascending: true })
          .order('start_time', { ascending: true })

        if (lessonsError) {
          console.error("Error fetching lessons:", lessonsError)
        }

        // --- PENYETELAN WAKTU AMAN ---
        const now = new Date()
        // Reset waktu ke 00:00:00 hari ini sesuai zona waktu lokal
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayTime = todayStart.getTime()

        const sevenDaysAgoTime = todayTime - (7 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgoTime = todayTime - (30 * 24 * 60 * 60 * 1000)

        let todayEarn = 0
        let weekEarn = 0
        let monthEarn = 0
        const validUpcoming: Lesson[] = []
        const activeStudentsMap = new Map<string, StudentSub>()

        lessonsData?.forEach((lesson: any) => {
          const price = Number(lesson.total_price) || 0
          const studentInfo = lesson.student

          // A. LOGIKA ESTIMATED EARNINGS (Berdasarkan Waktu Pembayaran / created_at)
          if (lesson.created_at && lesson.status !== 'Canceled') {
            const paymentTime = new Date(lesson.created_at).getTime()
            
            if (paymentTime >= todayTime) {
              todayEarn += price
            }
            if (paymentTime >= sevenDaysAgoTime) {
              weekEarn += price
            }
            if (paymentTime >= thirtyDaysAgoTime) {
              monthEarn += price
            }
          }

          // B. LOGIKA UPCOMING LESSONS (Berdasarkan Jadwal Kelas / schedule_date)
          const [year, month, day] = lesson.schedule_date.split('-')
          const lessonDate = new Date(Number(year), Number(month) - 1, Number(day))
          lessonDate.setHours(0,0,0,0)
          const lessonTime = lessonDate.getTime()

          if (lessonTime >= todayTime && lesson.status === 'Upcoming') {
            validUpcoming.push({
              id: lesson.id,
              dateStr: lessonDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              dayOfWeek: lessonDate.toLocaleDateString('en-US', { weekday: 'long' }),
              timeStr: `${lesson.start_time.substring(0, 5)} - ${lesson.end_time.substring(0, 5)}`,
              studentName: studentInfo?.full_name || "Unknown Student",
              subject: profile.subject_taught || "General",
              image: studentInfo?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
              rawDate: lessonDate
            })
          }

          // C. LIST OF STUDENTS
          if (lesson.status !== 'Canceled' && studentInfo && !activeStudentsMap.has(lesson.student_id)) {
            activeStudentsMap.set(lesson.student_id, {
              id: lesson.student_id,
              name: studentInfo.full_name || "Student",
              subject: profile.subject_taught || "General",
              status: "Active",
              renewDate: "",
              image: studentInfo.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop"
            })
          }
        })

        // Sorting Upcoming: Urutan paling dekat di paling atas
        validUpcoming.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())

        setUpcomingLessons(validUpcoming.slice(1)) 
        if (validUpcoming.length > 0) {
          setNextLesson(validUpcoming[0]) 
        } else {
          setNextLesson(null)
        }

        setEarnings({
          today: todayEarn,
          last7Days: weekEarn,
          last30Days: monthEarn,
          balance: Number(profile.balance) || 0,
          lastWithdrawal: 0 
        })

        // 4. Ambil Active Subscriptions
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select(`
            id, status, renewal_date, student_id,
            student:users!student_id ( full_name, avatar_url )
          `)
          .eq('tutor_id', profile.id)
          .eq('status', 'Active')

        subsData?.forEach((sub: any) => {
          let renewDateStr = ""
          if (sub.renewal_date) {
            const [y, m, d] = sub.renewal_date.split('-')
            const rDate = new Date(Number(y), Number(m) - 1, Number(d))
            renewDateStr = rDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }

          const studentInfo = sub.student
          if (studentInfo) {
            activeStudentsMap.set(sub.student_id, {
              id: sub.student_id,
              name: studentInfo.full_name || "Student",
              subject: profile.subject_taught || "General",
              status: "Active",
              renewDate: renewDateStr,
              image: studentInfo.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop"
            })
          }
        })

        setStudents(Array.from(activeStudentsMap.values()))

      } catch (error) {
        console.error("Error fetching tutor dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading Dashboard...</div>
  }

  return (
    <main className="px-6 py-8 md:px-12 max-w-6xl mx-auto space-y-12">
      {/* Greeting */}
      <section>
        <p className="text-[#344675] mb-2 font-medium">Hi {tutorName},</p>
        <h1 className="text-3xl font-bold text-[#344675] mb-6">
          {nextLesson ? "Your Lesson Starts Soon" : "No Lessons Scheduled"}
        </h1>
        
        {nextLesson && (
          <Card className="max-w-2xl border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                    <Image src={nextLesson.image} alt={nextLesson.studentName} width={96} height={96} className="object-cover w-full h-full" />
                  </div>
                  <div>
                    <p className="text-sm text-[#7492c9] font-semibold mb-1">{nextLesson.dateStr}</p>
                    <h3 className="text-2xl font-bold text-[#344675] mb-1">{nextLesson.dayOfWeek} · {nextLesson.timeStr}</h3>
                    <p className="text-gray-500 font-medium">Teach {nextLesson.studentName} {nextLesson.subject}</p>
                  </div>
                </div>
                <Button className="w-full sm:w-auto bg-[#7492c9] hover:bg-[#5b78b0] text-white px-8 rounded-md font-bold">Join Now</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Upcoming Lessons */}
        <section>
          <h2 className="text-2xl font-bold text-[#344675] mb-6">Upcoming Lessons</h2>
          {upcomingLessons.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
              <Clock className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-[#344675] font-bold text-lg">No Upcoming Lessons</p>
              <p className="text-gray-500 text-sm mt-1">You don&apos;t have any future classes scheduled.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-transparent before:via-[#d4e1f4] before:to-transparent">
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-4 border-white bg-[#7492c9] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-4 bg-white rounded-lg shadow-sm border border-gray-100 group-odd:mr-4 group-even:ml-4">
                    <p className="text-sm text-[#7492c9] font-semibold">{lesson.dateStr}</p>
                    <h4 className="font-bold text-[#344675] text-lg">{lesson.dayOfWeek} · {lesson.timeStr}</h4>
                    <p className="text-gray-500 text-sm font-medium">Teach {lesson.studentName} {lesson.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* List of Students */}
        <section>
          <h2 className="text-2xl font-bold text-[#344675] mb-6">List Of Students</h2>
          {students.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
              <p className="text-[#344675] font-bold text-lg">No Active Students</p>
              <p className="text-gray-500 text-sm mt-1">Students who book your lessons will appear here.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 px-1">
              {students.map((student) => (
                <Card key={student.id} className="min-w-[260px] bg-[#e8f1f8] border-none shadow-sm relative">
                  <span className="absolute top-4 right-4 bg-green-200 text-green-700 text-xs font-bold px-3 py-1 rounded-md">{student.status}</span>
                  <CardContent className="p-6">
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-5 border-2 border-white shadow-sm">
                      <Image src={student.image} alt={student.name} width={80} height={80} className="object-cover w-full h-full" />
                    </div>
                    <h4 className="font-bold text-[#344675] mb-4 text-lg">Teach {student.name} {student.subject}</h4>
                    <div className="space-y-3 text-sm text-[#344675] font-medium">
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#7492c9]"/> All Lessons Scheduled</p>
                      {student.renewDate && (
                        <p className="flex items-start gap-2 leading-tight">
                          <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-[#7492c9]"/> 
                          Subscription renews On {student.renewDate}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Money Earned */}
      <section>
        <h2 className="text-2xl font-bold text-[#344675] mb-6">Money Earned</h2>
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl">
          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#344675] mb-6">Estimated Earnings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-white bg-[#7492c9] px-2 py-1 rounded whitespace-nowrap">Today So Far</span>
                  <p className="text-md font-bold text-[#344675] mt-3">Rp {earnings.today.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#344675] bg-[#d4e1f4] px-2 py-1 rounded whitespace-nowrap">Last 7 Days</span>
                  <p className="text-md font-bold text-[#344675] mt-3">Rp {earnings.last7Days.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">Last 30 Days</span>
                  <p className="text-md font-bold text-[#344675] mt-3">Rp {earnings.last30Days.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6 flex flex-col h-full justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#344675] mb-2">Total Balance</h3>
                <h3 className="text-4xl font-bold text-[#344675]">Rp {earnings.balance.toLocaleString('id-ID')}</h3>
              </div>
              <div className="flex justify-between items-end mt-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Withdrawal</p>
                  <p className="font-bold text-[#344675]">Rp {earnings.lastWithdrawal.toLocaleString('id-ID')}</p>
                </div>
                <Button className="bg-[#7492c9] hover:bg-[#5b78b0] text-white font-bold">Withdrawal</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}