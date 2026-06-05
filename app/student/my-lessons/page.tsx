"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Clock, BookOpen, Star, MessageSquare, X, FileText, Link2, Loader2, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StudentSubmenu } from "@/components/student/student-submenu"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

// Interfaces
interface LessonData {
  id: string
  date: string
  day: string
  time: string
  tutor: string
  subject: string
  completed: boolean
  tutorImage: string
  tutorProfileId: string
}

interface TutorCardData {
  id: string
  tutorProfileId: string
  tutorUserId: string
  name: string
  subject: string
  subscriptionLessonsLeft: number // Kuota langganan tersisa
  bookedLessonsCount: number      // Kelas yang sudah dibooking (Upcoming)
  pricePerLesson: number
  status: string
  tutorImage: string
}

interface Material {
  id: string
  title: string
  description: string | null
  material_type: "file" | "link"
  url: string
}

export default function MyLessonsPage() {
  const [activeTab, setActiveTab] = useState<"lessons" | "tutors">("lessons")
  
  // Data States
  const [upcomingLessons, setUpcomingLessons] = useState<LessonData[]>([])
  const [weekdayLessons, setWeekdayLessons] = useState<LessonData[]>([])
  const [pastLessons, setPastLessons] = useState<LessonData[]>([])
  const [tutorSubscriptions, setTutorSubscriptions] = useState<TutorCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals Core State
  const [selectedTutor, setSelectedTutor] = useState<TutorCardData | null>(null)

  // Materials Modal States
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false)

  // Review Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewedTutorsSet, setReviewedTutorsSet] = useState<Set<string>>(new Set())

  const supabase = createClient()
  const { toast } = useToast()

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const studentId = session.user.id

      // Fetch riwayat review siswa
      const { data: myReviews } = await supabase
        .from('reviews')
        .select('tutor_id')
        .eq('student_id', studentId)
      
      setReviewedTutorsSet(new Set(myReviews?.map(r => r.tutor_id) || []))

      // 1. Fetch Data Lessons (Tambahkan price_per_hour dan users id)
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id, schedule_date, start_time, end_time, status,
          tutor_profiles (
            id,
            subject_taught,
            price_per_hour,
            users ( id, full_name, avatar_url )
          )
        `)
        .eq('student_id', studentId)
        .order('schedule_date', { ascending: true })

      if (lessonsError) throw lessonsError

      // 2. Fetch Data Subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id, status, lessons_left,
          tutor_profiles (
            id, price_per_hour, subject_taught,
            users ( id, full_name, avatar_url )
          )
        `)
        .eq('student_id', studentId)

      if (subsError) throw subsError

      // --- INISIALISASI MAP TUTOR ---
      const tutorMap = new Map<string, TutorCardData>()

      // A. Masukkan data dasar dari Subscriptions (jika ada)
      subsData?.forEach((sub: any) => {
        const tutorProfile = sub.tutor_profiles
        const tutorInfo = tutorProfile?.users
        if (!tutorProfile?.id) return

        tutorMap.set(tutorProfile.id, {
          id: sub.id,
          tutorProfileId: tutorProfile.id,
          tutorUserId: tutorInfo?.id,
          name: tutorInfo?.full_name || "Unknown Tutor",
          subject: tutorProfile?.subject_taught || "General",
          subscriptionLessonsLeft: sub.lessons_left || 0, // Ambil dari kuota
          bookedLessonsCount: 0, // Akan dihitung di bawah
          pricePerLesson: Number(tutorProfile?.price_per_hour || 0),
          status: sub.status.toLowerCase(),
          tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
        })
      })

      // B. Proses Lessons: Masukkan ke list, dan hitung Booked Lessons
      const upcoming: LessonData[] = []
      const past: LessonData[] = []
      const weekdayMap = new Map<string, LessonData>()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      lessonsData?.forEach((lesson: any) => {
        const [year, month, day] = lesson.schedule_date.split('-')
        const lessonDate = new Date(Number(year), Number(month) - 1, Number(day))
        
        const tutorProfile = lesson.tutor_profiles
        const tutorInfo = tutorProfile?.users

        const dateStr = lessonDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        const dayStr = lessonDate.toLocaleDateString('en-US', { weekday: 'long' })
        const timeStr = `${lesson.start_time.substring(0, 5)} - ${lesson.end_time.substring(0, 5)}`

        const formattedLesson: LessonData = {
          id: lesson.id,
          date: dateStr,
          day: dayStr,
          time: timeStr,
          tutor: tutorInfo?.full_name || "Unknown Tutor",
          subject: tutorProfile?.subject_taught || "General",
          completed: lesson.status === 'Completed',
          tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
          tutorProfileId: tutorProfile?.id
        }

        if (lessonDate >= today && lesson.status === 'Upcoming') {
          upcoming.push(formattedLesson)
          
          const uniqueKey = `${formattedLesson.day}-${formattedLesson.time}-${formattedLesson.tutor}`
          if (!weekdayMap.has(uniqueKey)) {
            weekdayMap.set(uniqueKey, formattedLesson)
          }

          // Cek Tutor Map: Tambah booked class jika sudah ada, atau buat baru jika belum
          if (tutorProfile?.id) {
            if (tutorMap.has(tutorProfile.id)) {
              tutorMap.get(tutorProfile.id)!.bookedLessonsCount += 1
            } else {
              tutorMap.set(tutorProfile.id, {
                id: `auto-${tutorProfile.id}`,
                tutorProfileId: tutorProfile.id,
                tutorUserId: tutorInfo?.id,
                name: tutorInfo?.full_name || "Unknown Tutor",
                subject: tutorProfile?.subject_taught || "General",
                subscriptionLessonsLeft: 0, // Karena tidak ada di tabel subscription
                bookedLessonsCount: 1,      // Mulai dari 1
                pricePerLesson: Number(tutorProfile?.price_per_hour || 0),
                status: 'active',
                tutorImage: tutorInfo?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
              })
            }
          }
        } else {
          past.push({ ...formattedLesson, completed: true })
        }
      })

      setUpcomingLessons(upcoming)
      setPastLessons(past.reverse())
      setWeekdayLessons(Array.from(weekdayMap.values()))
      setTutorSubscriptions(Array.from(tutorMap.values()))

    } catch (error) {
      console.error("Error fetching student lessons:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [supabase])

  // Aksi Modal
  const handleOpenMaterials = async (tutor: TutorCardData) => {
    setSelectedTutor(tutor)
    setIsMaterialsModalOpen(true)
    setIsLoadingMaterials(true)
    try {
      const { data, error } = await supabase
        .from('tutor_materials')
        .select('id, title, description, material_type, url')
        .eq('tutor_id', tutor.tutorProfileId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMaterials(data || [])
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat materi." })
    } finally {
      setIsLoadingMaterials(false)
    }
  }

  const handleOpenReview = (tutor: TutorCardData) => {
    setSelectedTutor(tutor)
    setIsReviewModalOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedTutor || !reviewText.trim()) return
    setIsSubmittingReview(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('reviews')
        .insert({
          student_id: session.user.id,
          tutor_id: selectedTutor.tutorProfileId,
          rating: reviewRating,
          comment: reviewText
        })

      if (error) throw error

      toast({ title: "Review Terkirim!", description: `Terima kasih telah memberikan penilaian untuk ${selectedTutor.name}.` })
      
      setReviewedTutorsSet(prev => new Set(prev).add(selectedTutor.tutorProfileId))
      setIsReviewModalOpen(false)
      setReviewText("")
      setReviewRating(5)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal mengirim review", description: error.message })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <>
      <StudentSubmenu />
      <main className="px-6 py-8 md:px-12 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#344675]">My Lessons</h1>
          <Link href="/student/find-tutors">
            <Button variant="outline" className="border-2 border-[#344675] text-[#344675] hover:bg-[#d4e1f4] font-bold rounded-md">
              Add Extra Lessons
            </Button>
          </Link>
        </div>

        <div className="flex gap-8 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab("lessons")}
            className={cn("pb-3 font-bold transition-colors border-b-2 text-sm md:text-base", activeTab === "lessons" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600")}
          >
            Lessons
          </button>
          <button
            onClick={() => setActiveTab("tutors")}
            className={cn("pb-3 font-bold transition-colors border-b-2 text-sm md:text-base", activeTab === "tutors" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600")}
          >
            Tutors
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#344675] font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your data...
          </div>
        ) : activeTab === "lessons" ? (
          <>
            {/* Upcoming Lessons */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-[#344675] mb-4">Upcoming Lessons</h2>
              {upcomingLessons.length === 0 ? (
                <p className="text-gray-500 bg-white p-4 rounded-lg border border-gray-100 text-center text-sm">No upcoming lessons.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingLessons.map((lesson) => (
                    <Card key={lesson.id} className="border-none shadow-sm">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border">
                          <Image src={lesson.tutorImage} alt={lesson.tutor} width={56} height={56} className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <p className="font-bold text-[#344675] text-sm md:text-base">
                            {lesson.day}, {lesson.date} · {lesson.time}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {lesson.tutor} · <span className="text-[#7492c9]">{lesson.subject}</span>
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
                          <Image src={lesson.tutorImage} alt={lesson.tutor} width={56} height={56} className="object-cover w-full h-full" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-[#7492c9]" />
                          <div>
                            <p className="font-bold text-[#344675] text-sm md:text-base">
                              Every {lesson.day} · {lesson.time}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              {lesson.tutor} · <span className="text-[#7492c9]">{lesson.subject}</span>
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
                <p className="text-gray-500 bg-white p-4 rounded-lg border border-gray-100 text-center text-sm">No past lessons.</p>
              ) : (
                <div className="space-y-3">
                  {pastLessons.map((lesson) => (
                    <Card key={lesson.id} className="border-none shadow-sm bg-gray-50/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border opacity-70">
                          <Image src={lesson.tutorImage} alt={lesson.tutor} width={56} height={56} className="object-cover w-full h-full grayscale-[20%]" />
                        </div>
                        <div className="flex items-center gap-2">
                          {lesson.completed && <Check className="w-5 h-5 text-green-500" />}
                          <div>
                            <p className="font-bold text-[#344675]/80 text-sm md:text-base">
                              {lesson.day}, {lesson.date} · {lesson.time}
                            </p>
                            <p className="text-sm text-gray-400 font-medium">
                              {lesson.tutor} · {lesson.subject}
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
              <p className="text-gray-500 bg-white p-4 rounded-lg border border-gray-100 text-center text-sm">You haven&apos;t booked or subscribed to any tutors yet.</p>
            ) : (
              <div className="space-y-6">
                {tutorSubscriptions.map((tutor) => {
                  const hasReviewed = reviewedTutorsSet.has(tutor.tutorProfileId)
                  return (
                    <Card key={tutor.id} className="border border-gray-100 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        {/* Atas: Profile & Stats */}
                        <div className="p-6 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                          <div className="w-20 h-20 rounded-xl overflow-hidden border shrink-0 shadow-inner">
                            <Image src={tutor.tutorImage} alt={tutor.name} width={80} height={80} className="object-cover w-full h-full" />
                          </div>
                          
                          <div className="flex-1 mt-2 md:mt-0">
                            <h3 className="font-bold text-[#344675] text-xl tracking-tight">{tutor.name}</h3>
                            <p className="text-[#7492c9] font-semibold text-sm mt-0.5">{tutor.subject}</p>
                            <p className="text-xs text-gray-400 font-medium mt-2">Rp {tutor.pricePerLesson.toLocaleString('id-ID')} / Session</p>
                          </div>
                          
                          {/* DETAIL RINCIAN KELAS */}
                          <div className="flex flex-col gap-2 mt-4 md:mt-0 items-center md:items-end bg-gray-50 p-3 rounded-lg border border-gray-100 min-w-[200px]">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="text-xs text-gray-500 font-medium">Subscription left:</span>
                              <span className="font-bold text-[#344675]">{tutor.subscriptionLessonsLeft} <span className="text-[10px] font-normal">class</span></span>
                            </div>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="text-xs text-gray-500 font-medium">Booked upcoming:</span>
                              <span className="font-bold text-[#7492c9]">{tutor.bookedLessonsCount} <span className="text-[10px] font-normal">class</span></span>
                            </div>
                            
                            {tutor.status === "canceled" && (
                              <p className="text-red-500 text-xs font-bold w-full text-right mt-1 pt-1 border-t border-gray-200">
                                Subscription Cancelled
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bawah: Tombol Kontrol Aksi */}
                        <div className="bg-[#f4f7f9] border-t border-gray-100 px-6 py-3.5 flex flex-wrap items-center justify-end gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => handleOpenMaterials(tutor)}
                            className="bg-white hover:bg-gray-50 text-[#344675] border-gray-200 font-bold gap-2 h-9 text-xs"
                          >
                            <BookOpen className="w-4 h-4 text-[#7492c9]" /> Materials
                          </Button>
                          
                          <Button 
                            variant={hasReviewed ? "ghost" : "outline"}
                            disabled={hasReviewed}
                            onClick={() => handleOpenReview(tutor)}
                            className={cn(
                              "font-bold gap-2 h-9 text-xs",
                              hasReviewed 
                                ? "bg-gray-100 text-gray-400 border-none cursor-not-allowed" 
                                : "bg-white hover:bg-gray-50 text-[#344675] border-gray-200"
                            )}
                          >
                            <Star className={cn("w-4 h-4", hasReviewed ? "text-gray-300" : "text-yellow-500 fill-yellow-500")} /> 
                            {hasReviewed ? "Reviewed" : "Review Tutor"}
                          </Button>

                          <Link href={`/student/find-tutors/${tutor.tutorUserId}`}>
                            <Button className="bg-[#7492c9] hover:bg-[#5b78b0] text-white font-bold gap-2 h-9 text-xs shadow-sm">
                              <CalendarPlus className="w-4 h-4" /> 
                              {tutor.subscriptionLessonsLeft === 0 ? "Rebook Tutor" : "Book More"}
                            </Button>
                          </Link>
                          
                          <Link href={`/student/messages?newContact=${tutor.tutorUserId}`}>
                            <Button className="bg-[#344675] hover:bg-[#233052] text-white font-bold gap-2 h-9 text-xs shadow-sm">
                              <MessageSquare className="w-4 h-4" /> Message
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* --- POPUP 1: MATERIALS MODAL --- */}
      {isMaterialsModalOpen && selectedTutor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-lg shadow-2xl rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-[#f4f7f9] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#344675] text-lg">Materi Pembelajaran</h3>
                <p className="text-xs text-gray-500 mt-0.5">Disediakan oleh {selectedTutor.name}</p>
              </div>
              <button onClick={() => setIsMaterialsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {isLoadingMaterials ? (
                <div className="py-8 text-center text-gray-500 text-sm font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengambil dokumen materi...
                </div>
              ) : materials.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed">
                  Tutor belum mengunggah berkas materi untuk kelas ini.
                </div>
              ) : (
                materials.map((item) => (
                  <div key={item.id} className="p-4 border rounded-xl bg-white flex items-start gap-4 hover:border-[#7492c9] transition-colors group">
                    <div className="w-9 h-9 bg-[#f4f7f9] text-[#7492c9] rounded-lg flex items-center justify-center shrink-0">
                      {item.material_type === "file" ? <FileText className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#344675] text-sm truncate">{item.title}</h4>
                      {item.description && <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-normal">{item.description}</p>}
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block text-xs font-bold text-[#7492c9] hover:underline mt-2"
                      >
                        Unduh / Buka Tautan →
                      </a>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- POPUP 2: REVIEW MODAL --- */}
      {isReviewModalOpen && selectedTutor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-md shadow-2xl rounded-xl border border-gray-100 overflow-hidden bg-white">
            <div className="px-6 py-4 border-b bg-[#f4f7f9] flex items-center justify-between">
              <h3 className="font-bold text-[#344675] text-lg">Berikan Review</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Bagaimana pengalaman belajar Anda bersama</p>
                <p className="font-bold text-[#7492c9] text-base">{selectedTutor.name}?</p>
              </div>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-9 h-9 cursor-pointer transition-transform active:scale-95", 
                      star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 hover:text-yellow-200"
                    )}
                    onClick={() => setReviewRating(star)}
                  />
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tulis ulasan Anda di sini... (Contoh: Penjelasan kakak sangat mudah dipahami!)"
                className="w-full h-28 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7492c9] text-[#344675] mb-5"
              />

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" type="button" onClick={() => setIsReviewModalOpen(false)} disabled={isSubmittingReview}>
                  Batal
                </Button>
                <Button 
                  onClick={handleSubmitReview} 
                  disabled={isSubmittingReview || !reviewText.trim()} 
                  className="bg-[#344675] hover:bg-[#233052] text-white font-bold min-w-[110px]"
                >
                  {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim Ulasan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}