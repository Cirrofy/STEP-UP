"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  tutor: { id: string; name: string; image: string }
  onContinue: (date: string, time: string, duration: string) => void
}

export function BookingModal({ isOpen, onClose, tutor, onContinue }: BookingModalProps) {
  const [duration, setDuration] = useState<"1" | "2">("1")
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(0) 
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  })

  const [availabilities, setAvailabilities] = useState<any[]>([])
  const [bookedLessons, setBookedLessons] = useState<any[]>([]) // STATE BARU: Untuk menyimpan jadwal yang sudah dipesan
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const nextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(next)
    setSelectedTime(null) 
  }

  const prevWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(prev)
    setSelectedTime(null)
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

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !tutor.id) return
      setIsLoading(true)
      try {
        // 1. Ambil Template Kosong
        const { data: availData } = await supabase
          .from('tutor_availabilities')
          .select('day_of_week, time_slot')
          .eq('tutor_id', tutor.id)

        // 2. Ambil Jadwal yang SUDAH Dipesan (yang statusnya belum dibatalkan)
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('schedule_date, start_time, duration_hours')
          .eq('tutor_id', tutor.id)
          .neq('status', 'Canceled')

        setAvailabilities(availData || [])
        setBookedLessons(lessonData || [])
      } catch (error) {
        console.error("Error fetching scheduling data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [isOpen, tutor.id, supabase])

  useEffect(() => {
    if (!isOpen) {
      setSelectedTime(null)
      setSelectedDayOfWeek(0)
      setDuration("1")
    }
  }, [isOpen])

  if (!isOpen) return null

  // --- LOGIKA FILTER JADWAL BENTROK & TANGGAL LAMPAU ---
  const now = new Date() // Waktu lokal komputer murid saat ini
  
  // Menentukan apakah tombol Previous Week harus dinonaktifkan
  const currentWeekStartBoundary = new Date()
  const todayDay = currentWeekStartBoundary.getDay()
  const diffDay = currentWeekStartBoundary.getDate() - todayDay + (todayDay === 0 ? -6 : 1)
  currentWeekStartBoundary.setDate(diffDay)
  currentWeekStartBoundary.setHours(0,0,0,0)
  
  const isPrevWeekDisabled = currentWeekStart <= currentWeekStartBoundary

  // 1. Buat Set dari jadwal yang sudah dibooking (Format: "YYYY-MM-DD-HH")
  const bookedSet = new Set<string>()
  bookedLessons.forEach(lesson => {
    const startHour = parseInt(lesson.start_time.split(':')[0], 10)
    for (let i = 0; i < lesson.duration_hours; i++) {
      const blockedHour = (startHour + i).toString().padStart(2, '0')
      bookedSet.add(`${lesson.schedule_date}-${blockedHour}`)
    }
  })

  // 2. Dapatkan tanggal persis (YYYY-MM-DD) yang sedang dipilih di kalender UI
  const activeDateInfo = dynamicWeekDays.find(d => d.dayOfWeek === selectedDayOfWeek)
  let localDateStr = ""
  if (activeDateInfo?.fullDate) {
    const d = activeDateInfo.fullDate
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    localDateStr = `${year}-${month}-${day}`
  }

  // 3. Ambil slot dari template mingguan
  const templateSlots = availabilities
    .filter((a) => a.day_of_week === selectedDayOfWeek)
    .map((a) => a.time_slot.substring(0, 5).replace(':', '.'))
    .sort()

  // 4. Saring (Filter) slot yang tersedia & belum kedaluwarsa
  const validSlots = templateSlots.filter(timeStr => {
    const hourStr = timeStr.split('.')[0] 
    const hourInt = parseInt(hourStr, 10)

    // SYARAT BARU: Slot jam ini tidak boleh berada di masa lalu!
    if (activeDateInfo?.fullDate) {
      const slotDateTime = new Date(activeDateInfo.fullDate)
      slotDateTime.setHours(hourInt, 0, 0, 0)
      if (slotDateTime < now) return false // Tanggal/Jam sudah lewat
    }

    // Syarat A: Jam ini sendiri TIDAK BOLEH sudah dipesan
    if (bookedSet.has(`${localDateStr}-${hourStr}`)) return false;

    // Syarat B: Jika murid memilih durasi 2 Jam, jam berikutnya juga harus kosong dan ada
    if (duration === "2") {
      const nextHourStr = (hourInt + 1).toString().padStart(2, '0')
      if (!templateSlots.includes(`${nextHourStr}.00`)) return false;
      if (bookedSet.has(`${localDateStr}-${nextHourStr}`)) return false;
    }

    return true; 
  })

  // 5. Kelompokkan ke Pagi, Siang, Malam
  const morningSlots = validSlots.filter(t => parseInt(t) < 12)
  const afternoonSlots = validSlots.filter(t => parseInt(t) >= 12 && parseInt(t) < 17)
  const eveningSlots = validSlots.filter(t => parseInt(t) >= 17)

  const formattedDateString = activeDateInfo 
    ? `${activeDateInfo.month} ${activeDateInfo.dateNum}, ${activeDateInfo.fullDate.getFullYear()}` 
    : ""

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <Image src={tutor.image} alt={tutor.name} width={48} height={48} className="object-cover w-full h-full" />
              </div>
              <div>
                <h2 className="font-bold text-[#344675] text-lg">Book A Lesson</h2>
                <p className="text-sm text-gray-500">Discuss Your Level First And Learning Plan!</p>
              </div>
            </div>
            <button onClick={onClose}><X className="w-6 h-6 text-[#344675]" /></button>
          </div>

          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => { setDuration("1"); setSelectedTime(null); }}
              className={cn("flex-1 pb-2 text-center font-medium border-b-2 transition-colors", duration === "1" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent")}
            >1 Hour</button>
            <button
              onClick={() => { setDuration("2"); setSelectedTime(null); }}
              className={cn("flex-1 pb-2 text-center font-medium border-b-2 transition-colors", duration === "2" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent")}
            >2 Hours</button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={prevWeek} className="w-8 h-8 rounded bg-[#f4f7f9] hover:bg-[#e8f1f8] flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4 text-[#344675]" />
            </button>
            <span className="font-medium text-[#344675] min-w-[150px] text-center">{weekHeaderString}</span>
            <button onClick={nextWeek} className="w-8 h-8 rounded bg-[#f4f7f9] hover:bg-[#e8f1f8] flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 text-[#344675]" />
            </button>
          </div>

          <div className="flex justify-between mb-6">
            {dynamicWeekDays.map((d) => (
              <button
                key={d.dayOfWeek}
                onClick={() => { setSelectedDayOfWeek(d.dayOfWeek); setSelectedTime(null); }}
                className={cn("flex flex-col items-center px-2 py-1 rounded transition-colors min-w-[40px]", selectedDayOfWeek === d.dayOfWeek ? "border-2 border-[#7492c9] bg-[#f4f7f9]" : "hover:bg-gray-50")}
              >
                <span className="text-xs text-[#344675] font-semibold">{d.day}</span>
                <span className="font-bold text-[#344675]">{d.dateNum}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4 min-h-[150px]">
            {isLoading ? (
              <p className="text-center text-gray-400 py-8">Checking availability...</p>
            ) : validSlots.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No available slots on this day.</p>
            ) : (
              <>
                {morningSlots.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-semibold">Morning</p>
                    <div className="flex flex-wrap gap-2">
                      {morningSlots.map((time) => (
                        <button key={time} onClick={() => setSelectedTime(time)} className={cn("px-4 py-2 rounded-md border transition-colors text-sm font-semibold", selectedTime === time ? "border-[#7492c9] bg-[#d4e1f4] text-[#344675]" : "border-gray-200 text-gray-600 hover:border-[#7492c9]")}>{time}</button>
                      ))}
                    </div>
                  </div>
                )}
                {afternoonSlots.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-semibold">Afternoon</p>
                    <div className="flex flex-wrap gap-2">
                      {afternoonSlots.map((time) => (
                        <button key={time} onClick={() => setSelectedTime(time)} className={cn("px-4 py-2 rounded-md border transition-colors text-sm font-semibold", selectedTime === time ? "border-[#7492c9] bg-[#d4e1f4] text-[#344675]" : "border-gray-200 text-gray-600 hover:border-[#7492c9]")}>{time}</button>
                      ))}
                    </div>
                  </div>
                )}
                {eveningSlots.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-semibold">Evening</p>
                    <div className="flex flex-wrap gap-2">
                      {eveningSlots.map((time) => (
                        <button key={time} onClick={() => setSelectedTime(time)} className={cn("px-4 py-2 rounded-md border transition-colors text-sm font-semibold", selectedTime === time ? "border-[#7492c9] bg-[#d4e1f4] text-[#344675]" : "border-gray-200 text-gray-600 hover:border-[#7492c9]")}>{time}</button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <Button
            onClick={() => selectedTime && onContinue(formattedDateString, selectedTime, duration)}
            disabled={!selectedTime}
            className="w-full mt-8 bg-white border-2 border-[#344675] text-[#344675] hover:bg-[#f4f7f9] font-bold rounded-full h-12 transition-all disabled:opacity-50"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}