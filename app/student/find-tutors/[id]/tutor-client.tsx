"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Star, Clock, BookOpen, GraduationCap, Globe, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookingModal } from "@/components/student/booking-modal"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

const allTimeSlots = ["07.00", "08.00", "09.00", "10.00", "11.00", "12.00", "13.00", "14.00", "15.00", "16.00", "17.00", "18.00", "19.00", "20.00", "21.00", "22.00", "23.00"]

export default function TutorProfilePage() {
  const router = useRouter()
  const params = useParams()
  const tutorUserId = params.id as string

  const [duration, setDuration] = useState<"1" | "2">("1")
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  const [tutorData, setTutorData] = useState<any>(null)
  const [availabilitiesTemplate, setAvailabilitiesTemplate] = useState<any[]>([])
  const [bookedLessons, setBookedLessons] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // --- LOGIKA KALENDER DINAMIS ---
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  })

  const nextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(next)
  }

  const prevWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(prev)
  }

  const dynamicWeekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }), 
        dateNum: date.getDate(), 
        dayOfWeek: i, 
        fullDate: date,
        month: date.toLocaleDateString("en-US", { month: "long" }) 
      }
    })
  }, [currentWeekStart])

  const weekHeaderString = useMemo(() => {
    const start = dynamicWeekDays[0]
    const end = dynamicWeekDays[6]
    return `${start.month.substring(0, 3)} ${start.dateNum} - ${end.month.substring(0, 3)} ${end.dateNum}, ${end.fullDate.getFullYear()}`
  }, [dynamicWeekDays])

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchTutorData = async () => {
      if (!tutorUserId) { setIsLoading(false); return }

      try {
        // 1. Ambil profil tutor & nama
        const { data: profileData, error: profileError } = await supabase
          .from('tutor_profiles')
          .select(`*, users ( full_name, avatar_url )`)
          .eq('user_id', tutorUserId)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profileData) { setTutorData(null); setIsLoading(false); return }

        // 2. Ambil data pendidikan (resume)
        const { data: resumeData } = await supabase.from('tutor_resumes').select('*').eq('tutor_id', profileData.id).eq('type', 'education')

        // 3. Ambil data review
        const { data: reviewsData } = await supabase.from('reviews').select(`*, users!student_id ( full_name, avatar_url )`).eq('tutor_id', profileData.id)

        // 4. Ambil jadwal template
        const { data: availData } = await supabase.from('tutor_availabilities').select('*').eq('tutor_id', profileData.id)
        setAvailabilitiesTemplate(availData || [])

        // 5. Ambil data jadwal yang sudah di booking orang
        const { data: lessonData } = await supabase.from('lessons').select('schedule_date, start_time, duration_hours').eq('tutor_id', profileData.id).neq('status', 'Canceled')
        setBookedLessons(lessonData || [])

        // 6. Kalkulasi Rating Rata-Rata
        const totalRating = reviewsData?.reduce((sum: number, rev: any) => sum + rev.rating, 0) || 0
        const avgRating = reviewsData && reviewsData.length > 0 ? Number((totalRating / reviewsData.length).toFixed(1)) : 0

        // Format data profil
        const formattedTutor = {
          id: profileData.id, 
          name: profileData.users?.full_name || "Unknown",
          subject: profileData.subject_taught,
          level: profileData.education_level,
          tagline: profileData.short_description,
          experience: `${profileData.years_experience || 0}+ Years`,
          lessonsTaught: `${profileData.lessons_taught || 0}+`,
          responseTime: "< 2 Hours",
          rating: avgRating,
          reviewCount: reviewsData?.length || 0,
          price: profileData.price_per_hour,
          image: profileData.users?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
          about: profileData.about_me,
          specializations: profileData.specializations || [],
          // UBAH: Educations sekarang jadi ARRAY agar bisa di map lebih dari 1
          educations: resumeData?.map(edu => ({
            institution: edu.description,
            years: edu.time_period
          })) || [],
          languages: profileData.languages?.join(" • ") || "",
          reviews: reviewsData?.map(rev => ({
            id: rev.id,
            name: rev.users?.full_name,
            date: new Date(rev.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            rating: rev.rating,
            content: rev.comment,
            avatar: rev.users?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
          })) || []
        }

        setTutorData(formattedTutor)

      } catch (error: any) {
        console.error("Error fetching tutor profile:", JSON.stringify(error, null, 2))
        toast({ variant: "destructive", title: "Failed to load tutor data", description: error.message || "Error occurred" })
      } finally {
        setIsLoading(false)
      }
    }
    fetchTutorData()
  }, [tutorUserId, supabase, toast])

  const handleBookingContinue = (date: string, time: string, selectedDuration: string) => {
    setIsBookingModalOpen(false)
    router.push(`/student/payment?tutorId=${tutorData.id}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&duration=${selectedDuration}`)
  }

  // --- LOGIKA FILTER TABEL (WAKTU LAMPAU & BOOKING) ---
  const now = new Date()
  
  const currentWeekStartBoundary = new Date()
  const todayDay = currentWeekStartBoundary.getDay()
  const diffDay = currentWeekStartBoundary.getDate() - todayDay + (todayDay === 0 ? -6 : 1)
  currentWeekStartBoundary.setDate(diffDay)
  currentWeekStartBoundary.setHours(0,0,0,0)
  
  const isPrevWeekDisabled = currentWeekStart <= currentWeekStartBoundary

  const bookedSet = new Set<string>()
  bookedLessons.forEach(lesson => {
    const startHour = parseInt(lesson.start_time.split(':')[0], 10)
    for (let i = 0; i < lesson.duration_hours; i++) {
      const blockedHour = (startHour + i).toString().padStart(2, '0')
      bookedSet.add(`${lesson.schedule_date}-${blockedHour}`)
    }
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading Tutor Profile...</div>
  if (!tutorData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-xl font-bold text-[#344675]">Tutor not found!</p>
        <Link href="/student/find-tutors"><Button variant="outline">Back to Find Tutors</Button></Link>
      </div>
    )
  }

  return (
    <main className="px-6 py-6 md:px-12">
      <Link href="/student/find-tutors" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" /> Back To Find Tutors
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Header Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div>
                  <div className="w-28 h-28 rounded-lg overflow-hidden border">
                    <Image src={tutorData.image} alt={tutorData.name} width={112} height={112} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex items-center gap-1 mt-2 justify-center">
                    {[...Array(5)].map((_, i) => <Star key={i} className={cn("w-4 h-4", i < tutorData.rating ? "fill-[#344675] text-[#344675]" : "fill-gray-200 text-gray-200")} />)}
                  </div>
                  <p className="text-sm text-[#344675] text-center font-medium">({tutorData.reviewCount} Reviews)</p>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-[#344675]">{tutorData.name}</h1>
                  <p className="text-[#7492c9] font-medium">{tutorData.subject} · {tutorData.level}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{tutorData.tagline}</p>

                  <div className="flex gap-8 mt-5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#7492c9]" />
                      <div><p className="font-bold text-[#344675]">{tutorData.experience}</p><p className="text-xs text-gray-500">Experience</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#7492c9]" />
                      <div><p className="font-bold text-[#344675]">{tutorData.lessonsTaught} Lessons</p><p className="text-xs text-gray-500">Taught</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#7492c9]" />
                      <div><p className="font-bold text-[#344675]">{tutorData.responseTime}</p><p className="text-xs text-gray-500">Response Time</p></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-6 pt-6">
                <h3 className="font-bold text-[#344675] mb-2">About {tutorData.name}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{tutorData.about}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div>
                  <h4 className="font-bold text-[#344675] mb-3">Specializations</h4>
                  <ul className="space-y-2">
                    {tutorData.specializations?.map((spec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 font-medium">
                        <span className="text-[#7492c9] font-bold">✓</span> {spec}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-[#344675] mb-3">Education</h4>
                  {tutorData.educations && tutorData.educations.length > 0 ? (
                    <div className="space-y-4">
                      {tutorData.educations.map((edu: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <GraduationCap className="w-5 h-5 text-[#7492c9] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm text-[#344675] font-bold leading-tight">{edu.institution}</p>
                            <p className="text-sm text-gray-500">{edu.years}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No education details provided.</p>
                  )}

                  <h4 className="font-bold text-[#344675] mt-6 mb-3">Languages</h4>
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-[#7492c9]" />
                    <p className="text-sm text-gray-600 font-medium">{tutorData.languages || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card className="mb-6 bg-white border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#344675] text-lg mb-6">Student Reviews</h3>
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="text-center sm:w-32 shrink-0">
                  <p className="text-6xl font-bold text-[#344675]">{tutorData.rating}</p>
                  <div className="flex justify-center gap-1 my-3">
                    {[...Array(5)].map((_, i) => <Star key={i} className={cn("w-4 h-4", i < tutorData.rating ? "fill-[#344675] text-[#344675]" : "fill-gray-200 text-gray-200")} />)}
                  </div>
                  <p className="text-sm text-gray-500 font-semibold">{tutorData.reviewCount} Reviews</p>
                </div>
                <div className="flex-1 space-y-4">
                  {tutorData.reviews.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No reviews yet.</p>
                  ) : (
                    tutorData.reviews.map((review: any) => (
                      <Card key={review.id} className="border border-gray-100 shadow-none bg-[#f4f7f9]">
                        <CardContent className="p-5">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full overflow-hidden border">
                              <Image src={review.avatar} alt={review.name} width={40} height={40} className="object-cover w-full h-full" />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                <div>
                                  <p className="font-bold text-[#344675] text-sm">{review.name}</p>
                                  <p className="text-xs text-gray-500">{review.date}</p>
                                </div>
                                <div className="flex gap-0.5">
                                  {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-[#344675] text-[#344675]" />)}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability UI Table (DINAMIS) */}
          <Card className="shadow-sm border-gray-100">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#344675] text-lg mb-6">Upcoming Availability</h3>

              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3 bg-[#f4f7f9] p-1 rounded-md">
                  <button onClick={prevWeek} disabled={isPrevWeekDisabled} className={cn("w-8 h-8 rounded flex items-center justify-center transition-all", isPrevWeekDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:shadow-sm")}>
                    <ChevronLeft className={cn("w-5 h-5", isPrevWeekDisabled ? "text-gray-400" : "text-[#344675]")} />
                  </button>
                  <button onClick={nextWeek} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white hover:shadow-sm transition-all">
                    <ChevronRight className="w-5 h-5 text-[#344675]" />
                  </button>
                  <span className="font-bold text-[#344675] px-2">{weekHeaderString}</span>
                </div>
                <div className="flex gap-2 bg-[#f4f7f9] p-1 rounded-md">
                  <Button variant={duration === "1" ? "default" : "ghost"} onClick={() => setDuration("1")} className={cn("h-8 px-4", duration === "1" ? "bg-white text-[#344675] shadow-sm font-bold" : "text-gray-500")}>1 Hrs</Button>
                  <Button variant={duration === "2" ? "default" : "ghost"} onClick={() => setDuration("2")} className={cn("h-8 px-4", duration === "2" ? "bg-white text-[#344675] shadow-sm font-bold" : "text-gray-500")}>2 Hrs</Button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-[#f4f7f9] border-b">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-[#344675] w-20">Time</th>
                      {dynamicWeekDays.map((day) => (
                        <th key={day.dayOfWeek} className="py-3 px-2 text-center text-[#344675] font-semibold min-w-[60px]">
                          <div className="text-xs uppercase tracking-wider text-gray-500">{day.day}</div>
                          <div className="text-lg">{day.dateNum}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y border-gray-100">
                    {allTimeSlots.map((time) => {
                      const hourStr = time.split('.')[0]
                      const hourInt = parseInt(hourStr, 10)

                      return (
                        <tr key={time} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-[#7492c9] font-medium">{time}</td>
                          {dynamicWeekDays.map((dayObj) => {
                            // 1. Cek apakah ada di template Tutor
                            const isTemplate = availabilitiesTemplate.some(a => a.day_of_week === dayObj.dayOfWeek && a.time_slot.startsWith(hourStr + ":"))
                            
                            if (!isTemplate) {
                              return <td key={dayObj.dayOfWeek} className="py-3 text-center"><span className="text-gray-300">-</span></td>
                            }

                            // 2. Cek waktu lampau
                            const slotDateTime = new Date(dayObj.fullDate)
                            slotDateTime.setHours(hourInt, 0, 0, 0)
                            const isPast = slotDateTime < now

                            // 3. Cek apakah di Booking
                            const d = dayObj.fullDate
                            const localDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                            let isBooked = bookedSet.has(`${localDateStr}-${hourStr}`)

                            // 4. Logika 2 jam
                            if (duration === "2" && !isPast && !isBooked) {
                              const nextHourStr = (hourInt + 1).toString().padStart(2, '0')
                              const nextIsTemplate = availabilitiesTemplate.some(a => a.day_of_week === dayObj.dayOfWeek && a.time_slot.startsWith(nextHourStr + ":"))
                              const nextIsBooked = bookedSet.has(`${localDateStr}-${nextHourStr}`)
                              if (!nextIsTemplate || nextIsBooked) {
                                isBooked = true // Paksa booked jika jam depannya ga bisa
                              }
                            }

                            return (
                              <td key={dayObj.dayOfWeek} className="py-3 text-center">
                                {isPast ? (
                                  <span className="text-gray-300 line-through text-xs font-medium">Passed</span>
                                ) : isBooked ? (
                                  <span className="text-red-400 line-through text-xs font-medium" title="Booked">Booked</span>
                                ) : (
                                  <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">{time}</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-[#344675]">
                Rp {tutorData.price.toLocaleString('id-ID')}
              </p>
              <p className="text-sm font-medium text-gray-500 mt-1">60 Minutes Per Session</p>

              <div className="space-y-3 mt-8">
                <Button 
                  className="w-full bg-[#7492c9] hover:bg-[#5b78b0] text-white font-bold h-12 rounded-md transition-all shadow-sm"
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  Request Booking
                </Button>
                <Link href={`/student/messages?newContact=${tutorUserId}`} className="w-full block">
                  <Button variant="outline" className="w-full border-2 border-[#344675] text-[#344675] hover:bg-[#d4e1f4] font-bold h-12 rounded-full transition-all">
                    Send Message
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        tutor={{ id: tutorData.id, name: tutorData.name, image: tutorData.image }}
        onContinue={handleBookingContinue}
      />
    </main>
  )
}