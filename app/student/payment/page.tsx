"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Star, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StepUpLogo } from "@/components/step-up-logo"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

function PaymentSuccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#344675] mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-6">
            Your lesson has been booked successfully. You will be redirected to the homepage.
          </p>
          <Button onClick={onClose} className="bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold">
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const tutorId = searchParams.get("tutorId")
  const lessonDate = searchParams.get("date") || "April 28, 2026" 
  const lessonTime = searchParams.get("time") || "16.00" 
  const paramDuration = searchParams.get("duration") || "1"

  const [duration, setDuration] = useState<"1" | "2">(paramDuration as "1" | "2")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const [tutorData, setTutorData] = useState<any>(null)
  const [review, setReview] = useState<string>("")
  const [reviewCount, setReviewCount] = useState<number>(0)
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCheckoutData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setStudentId(session.user.id)

      if (!tutorId) return

      try {
        const { data: profile, error } = await supabase
          .from('tutor_profiles')
          .select(`
            id,
            price_per_hour,
            users ( full_name, avatar_url ),
            reviews ( comment )
          `)
          .eq('id', tutorId)
          .single()

        if (error) throw error

        if (profile) {
          // FIX: Bypass TypeScript error untuk data relasi Supabase
          const userData = profile.users as any;

          setTutorData({
            id: profile.id,
            name: userData?.full_name || "Tutor",
            price: Number(profile.price_per_hour),
            image: userData?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
            rating: 5, 
          })

          const reviewsArray = profile.reviews || []
          setReviewCount(reviewsArray.length)
          if (reviewsArray.length > 0) {
            setReview(reviewsArray[0].comment)
          } else {
            setReview("No reviews yet. Be the first to leave a review!")
          }
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error loading details", description: err.message })
      }
    }
    fetchCheckoutData()
  }, [tutorId, supabase, toast])

  const price = tutorData?.price || 0
  const total = price * parseInt(duration)

  const formatTimeForDB = (timeStr: string, addHours: number = 0) => {
    const hour = parseInt(timeStr.split('.')[0]) + addHours
    return `${hour.toString().padStart(2, '0')}:00:00`
  }

  // FIX: Mem-parsing string tanggal lengkap dari Booking Modal dengan aman
  const formatDateForDB = (dateStr: string) => {
    const dateObj = new Date(dateStr)
    // Penyesuaian Timezone agar tidak mundur 1 hari (karena waktu UTC)
    dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset())
    return dateObj.toISOString().split('T')[0]
  }

  const handlePayment = async () => {
    if (!studentId || !tutorData) {
      toast({ variant: "destructive", title: "Session Error", description: "Please login." })
      return
    }

    setIsProcessing(true)

    try {
      // 1. Buat Jadwal Baru (Insert ke tabel lessons)
      const { error: lessonError } = await supabase
        .from('lessons')
        .insert({
          student_id: studentId,
          tutor_id: tutorData.id,
          schedule_date: formatDateForDB(lessonDate),
          start_time: formatTimeForDB(lessonTime),
          end_time: formatTimeForDB(lessonTime, parseInt(duration)),
          duration_hours: parseInt(duration),
          total_price: total,
          status: 'Upcoming'
        })

      if (lessonError) throw lessonError

      // 2. Tambahkan Saldo Tutor
      // Ambil saldo saat ini terlebih dahulu
      const { data: tutorProfile, error: profileError } = await supabase
        .from('tutor_profiles')
        .select('balance')
        .eq('id', tutorData.id)
        .single()

      if (profileError) throw profileError

      const currentBalance = Number(tutorProfile?.balance) || 0

      // Update dengan saldo baru
      const { error: updateBalanceError } = await supabase
        .from('tutor_profiles')
        .update({ balance: currentBalance + total })
        .eq('id', tutorData.id)

      if (updateBalanceError) throw updateBalanceError

      // 3. Tampilkan Modal Sukses
      setShowSuccessModal(true)
      
    } catch (err: any) {
      console.error("Payment Error:", JSON.stringify(err, null, 2))
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: err.message || "An error occurred while processing your booking."
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    router.push("/student") 
  }

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => router.push("/student"), 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessModal, router])

  if (!tutorData) return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading payment details...</div>

  // Pisahkan string tanggal untuk UI
  const dateParts = lessonDate.replace(',', '').split(' ') // "April 28 2026" -> ["April", "28", "2026"]

  return (
    <div className="min-h-screen bg-[#e8f1f8]">
      <header className="px-6 py-4 md:px-12 bg-[#e8f1f8]">
        <StepUpLogo />
      </header>

      <main className="px-6 py-8 md:px-12">
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="space-y-6">
            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#344675] mb-4">Your Tutor</h3>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100">
                    <Image src={tutorData.image} alt={tutorData.name} width={80} height={80} className="object-cover w-full h-full" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#344675]">{tutorData.name}</h2>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#344675] text-[#344675]" />)}
                      <span className="text-[#344675] ml-1 font-semibold">({reviewCount})</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#344675] mb-4">Trial Lesson Details</h3>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-[#d4e1f4] rounded-lg border border-[#aabce6]">
                    <p className="text-xs text-[#344675] font-semibold">{dateParts[0]}</p>
                    <p className="text-2xl font-bold text-[#344675]">{dateParts[1]}</p>
                  </div>
                  <div>
                    <p className="font-bold text-[#344675]">Lesson Date: {lessonDate} <br/> {lessonTime}-{parseInt(lessonTime) + parseInt(duration)}.00</p>
                    <p className="text-sm text-gray-500 font-medium">Don&apos;t Forget To Join The Meet!</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#344675] mb-4">Checkout Info</h3>
                <div className="flex border-b-2 border-gray-100 mb-4">
                  <button onClick={() => setDuration("1")} className={cn("flex-1 pb-3 text-center font-bold border-b-2 transition-colors", duration === "1" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600")}>1 Hour</button>
                  <button onClick={() => setDuration("2")} className={cn("flex-1 pb-3 text-center font-bold border-b-2 transition-colors", duration === "2" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600")}>2 Hours</button>
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[#344675] font-semibold">{duration === "1" ? "1 Hour" : "2 Hours"} Lesson</span>
                    <span className="font-bold text-[#344675]">Rp {price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t-2 border-gray-100">
                    <span className="font-bold text-[#344675] text-lg">Total</span>
                    <span className="font-bold text-[#344675] text-lg">Rp {total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-md">
              <CardContent className="p-8">
                <h3 className="font-bold text-[#344675] mb-4 text-lg">Choose How To Pay</h3>
                <div className="p-4 border border-[#7492c9] rounded-lg bg-white shadow-sm cursor-pointer">
                  <span className="text-[#344675] font-bold">💳 Mastercard / Bank Transfer</span>
                </div>

                <Button 
                  className="w-full mt-6 bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold h-14 rounded-md transition-all shadow-md"
                  onClick={handlePayment} disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : `Book The Lesson And Pay Rp ${total.toLocaleString('id-ID')}`}
                </Button>

                <p className="text-xs text-gray-500 mt-6 leading-relaxed font-medium">
                  By Pressing The &quot;Book Lesson And Pay · Rp {total.toLocaleString('id-ID')}&quot; Button, You Agree To STEP-UP&apos;S <a href="#" className="underline text-gray-600 font-bold">Refund And Payment Policy</a>
                </p>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed font-medium">
                  It&apos;s Safe To Pay On STEP-UP. All Transactions Are Protected By SSL Encryption.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-bold text-[#344675]">{tutorData.name} Is A Great Choice</h3>
                  <span className="text-sm font-semibold text-gray-500">{reviewCount} Reviews</span>
                </div>
                <div className="p-4 bg-[#f4f7f9] border border-gray-100 rounded-lg">
                  <p className="text-sm text-[#344675] italic leading-relaxed font-medium">&quot;{review}&quot;</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" className="w-48 border-[#344675] text-[#344675] hover:bg-[#d4e1f4] rounded-full h-12 font-bold transition-all" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </div>
        </div>
      </main>
      <PaymentSuccessModal isOpen={showSuccessModal} onClose={handleSuccessClose} />
    </div>
  )
}