"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Star, CheckCircle, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StepUpLogo } from "@/components/step-up-logo"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

function PaymentSuccessModal({ isOpen, onClose, isSub }: { isOpen: boolean; onClose: () => void; isSub: boolean }) {
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
            {isSub 
              ? "Your 1-Month Subscription has been confirmed! 4 lessons have been added to your subscription pool." 
              : "Your lesson has been booked successfully."} You will be redirected to the homepage.
          </p>
          <Button onClick={onClose} className="bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold">
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const tutorId = searchParams.get("tutorId")
  const lessonDate = searchParams.get("date") || "April 28, 2026" 
  const lessonTime = searchParams.get("time") || "16.00" 
  const paramDuration = searchParams.get("duration") || "1"
  
  // Ambil tipe booking dari URL
  const bookingType = searchParams.get("type") || "single"
  const isSubscription = bookingType === "subscription"

  // FIX: Durasi sekarang langsung mengunci pilihan dari modal jadwal sebelumnya, tidak bisa diubah di sini
  const duration = paramDuration

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

  // --- KALKULASI HARGA ---
  const price = tutorData?.price || 0
  const sessionCount = isSubscription ? 4 : 1 
  const total = price * parseInt(duration) * sessionCount

  const formatTimeForDB = (timeStr: string, addHours: number = 0) => {
    const hour = parseInt(timeStr.split('.')[0]) + addHours
    return `${hour.toString().padStart(2, '0')}:00:00`
  }

  const handlePayment = async () => {
    if (!studentId || !tutorData) {
      toast({ variant: "destructive", title: "Session Error", description: "Please login." })
      return
    }

    setIsProcessing(true)

    try {
      const baseDate = new Date(lessonDate)

      // FIX LOGIKA PERBEDAAN BOOKING SINGLE VS SUBSCRIPTION
      if (isSubscription) {
        const renewalDate = new Date(baseDate)
        renewalDate.setMonth(renewalDate.getMonth() + 1) // Perpanjang otomatis 1 bulan ke depan
        renewalDate.setMinutes(renewalDate.getMinutes() - renewalDate.getTimezoneOffset())

        // Jika subscription, masukkan 4 kuota pelajaran ke kolom lessons_left
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            student_id: studentId,
            tutor_id: tutorData.id,
            status: 'Active',
            lessons_left: 4, // Kuota mengendap di pool subscription
            renewal_date: renewalDate.toISOString().split('T')[0]
          })
          
        if (subError) throw subError

      } else {
        // Jika single booking, buat 1 baris jadwal di tabel lessons
        const scheduleDate = new Date(baseDate)
        scheduleDate.setMinutes(scheduleDate.getMinutes() - scheduleDate.getTimezoneOffset())

        const { error: lessonError } = await supabase
          .from('lessons')
          .insert({
            student_id: studentId,
            tutor_id: tutorData.id,
            schedule_date: scheduleDate.toISOString().split('T')[0],
            start_time: formatTimeForDB(lessonTime),
            end_time: formatTimeForDB(lessonTime, parseInt(duration)),
            duration_hours: parseInt(duration),
            total_price: price * parseInt(duration),
            status: 'Upcoming'
          })

        if (lessonError) throw lessonError
      }

      // 3. Tambahkan Saldo Tutor
      const { data: tutorProfile, error: profileError } = await supabase
        .from('tutor_profiles')
        .select('balance')
        .eq('id', tutorData.id)
        .single()

      if (profileError) throw profileError

      const currentBalance = Number(tutorProfile?.balance) || 0

      const { error: updateBalanceError } = await supabase
        .from('tutor_profiles')
        .update({ balance: currentBalance + total })
        .eq('id', tutorData.id)

      if (updateBalanceError) throw updateBalanceError

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
    router.push("/student/my-lessons") 
  }

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => router.push("/student/my-lessons"), 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessModal, router])

  if (!tutorData) return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading payment details...</div>

  const dateParts = lessonDate.replace(',', '').split(' ')

  return (
    <div className="min-h-screen bg-[#e8f1f8]">

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
                <h3 className="font-bold text-[#344675] mb-4">
                  {isSubscription ? "Subscription Details" : "Trial Lesson Details"}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-[#d4e1f4] rounded-lg border border-[#aabce6]">
                    <p className="text-xs text-[#344675] font-semibold">{dateParts[0]}</p>
                    <p className="text-2xl font-bold text-[#344675]">{dateParts[1]}</p>
                  </div>
                  <div>
                    <p className="font-bold text-[#344675]">
                      {isSubscription ? "Starting Plan Date" : "Lesson Date"}: {lessonDate} <br/> 
                      {lessonTime}-{parseInt(lessonTime) + parseInt(duration)}.00 ({duration} Hour)
                    </p>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      {isSubscription ? "4 classes pool will be credited into your dashboard." : "Don't Forget To Join The Meet!"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-[#344675]">Checkout Info</h3>
                  {isSubscription && (
                    <span className="flex items-center gap-1 text-xs font-bold bg-[#d4e1f4] text-[#344675] px-2 py-1 rounded">
                      <Repeat className="w-3 h-3" /> 1 Month Plan
                    </span>
                  )}
                </div>

                {/* FIX: Tab Selector 1 Hour / 2 Hour lama DILENYAPKAN dari halaman ini */}
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[#344675]">
                    <span className="font-semibold">Rate per Session ({duration} Hr)</span>
                    <span className="font-bold">Rp {(price * parseInt(duration)).toLocaleString('id-ID')}</span>
                  </div>
                  {isSubscription && (
                    <div className="flex justify-between items-center text-[#344675]">
                      <span className="font-semibold">Subscription Bundle Pack</span>
                      <span className="font-bold">x 4 Lessons</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t-2 border-gray-100">
                    <span className="font-bold text-[#344675] text-lg">Total Amount</span>
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
                  By Pressing The Button, You Agree To STEP-UP&apos;S <a href="#" className="underline text-gray-600 font-bold">Refund And Payment Policy</a>
                </p>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed font-medium">
                  It&apos;s Safe To Pay On STEP-UP. All Transactions Are Protected By SSL Encryption.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-bold text-[#344675]">Reviews for {tutorData.name}</h3>
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
      <PaymentSuccessModal isOpen={showSuccessModal} onClose={handleSuccessClose} isSub={isSubscription} />
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold bg-[#e8f1f8]">
        Memuat detail pembayaran...
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}