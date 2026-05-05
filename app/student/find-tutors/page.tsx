"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type Tutor = {
  id: string
  user_id: string
  name: string
  subject: string
  level: string
  description: string
  rating: number
  reviewCount: number
  price: number
  image: string
}

export default function FindTutorsPage() {
  const router = useRouter()
  
  // States untuk semua Filter
  const [subject, setSubject] = useState("all")
  const [level, setLevel] = useState("all") 
  const [day, setDay] = useState("all")
  const [time, setTime] = useState("all")
  const [priceRange, setPriceRange] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchTutors = async () => {
      setIsLoading(true)

      try {
        // 1. Persiapkan Query String
        // Jika user memfilter hari/jam, kita WAJIB melakukan !inner join ke tutor_availabilities
        // agar tutor yang tidak punya jadwal tersebut tidak muncul.
        const isFilteringAvailability = (day !== "all" && day !== "") || (time !== "all" && time !== "")
        
        let selectString = `
          id, user_id, subject_taught, education_level, short_description, price_per_hour,
          users!inner ( full_name, avatar_url ),
          reviews ( rating )
        `
        
        if (isFilteringAvailability) {
          selectString += `, tutor_availabilities!inner ( day_of_week, time_slot )`
        }

        let query = supabase.from('tutor_profiles').select(selectString)

        // 2. Terapkan Filter Subjek & Level
        if (subject !== "all" && subject !== "") {
          query = query.ilike('subject_taught', `%${subject}%`)
        }
        if (level !== "all" && level !== "") {
          query = query.ilike('education_level', `%${level}%`)
        }

        // 3. Terapkan Filter Harga
        if (priceRange !== "all" && priceRange !== "") {
          if (priceRange === "0-50") query = query.gte('price_per_hour', 0).lte('price_per_hour', 50000)
          else if (priceRange === "50-100") query = query.gte('price_per_hour', 50000).lte('price_per_hour', 100000)
          else if (priceRange === "100-150") query = query.gte('price_per_hour', 100000).lte('price_per_hour', 150000)
          else if (priceRange === "150-200") query = query.gte('price_per_hour', 150000).lte('price_per_hour', 200000)
          else if (priceRange === "200+") query = query.gte('price_per_hour', 200000)
        }

        // 4. Terapkan Filter Hari & Jam
        if (day !== "all" && day !== "") {
          const dayMap: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 }
          query = query.eq('tutor_availabilities.day_of_week', dayMap[day])
        }
        if (time !== "all" && time !== "") {
          if (time === "morning") query = query.gte('tutor_availabilities.time_slot', '06:00:00').lt('tutor_availabilities.time_slot', '12:00:00')
          if (time === "afternoon") query = query.gte('tutor_availabilities.time_slot', '12:00:00').lt('tutor_availabilities.time_slot', '18:00:00')
          if (time === "evening") query = query.gte('tutor_availabilities.time_slot', '18:00:00').lte('tutor_availabilities.time_slot', '23:59:59')
        }

        const { data, error } = await query

        if (error) throw error

        // 5. Format dan Hapus Duplikat
        // Karena Inner Join bisa membuat 1 profil muncul 5x jika dia punya 5 jadwal,
        // kita menggunakan Map untuk memfilter UUID yang unik.
        const uniqueTutorsMap = new Map()

        data?.forEach((tutor: any) => {
          if (!uniqueTutorsMap.has(tutor.id)) {
            const reviews = tutor.reviews || []
            const totalRating = reviews.reduce((sum: number, rev: any) => sum + rev.rating, 0)
            const averageRating = reviews.length > 0 ? Number((totalRating / reviews.length).toFixed(1)) : 0

            uniqueTutorsMap.set(tutor.id, {
              id: tutor.id,
              user_id: tutor.user_id,
              name: tutor.users?.full_name || "Unknown Tutor",
              subject: tutor.subject_taught || "General",
              level: tutor.education_level || "All Levels",
              description: tutor.short_description || "",
              rating: averageRating,
              reviewCount: reviews.length,
              price: tutor.price_per_hour || 0,
              image: tutor.users?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
            })
          }
        })

        setTutors(Array.from(uniqueTutorsMap.values()))

      } catch (error: any) {
        console.error("Error fetching tutors:", error)
        toast({ variant: "destructive", title: "Failed to load tutors", description: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTutors()
  }, [subject, level, day, time, priceRange, supabase, toast]) 

  return (
    <main className="flex min-h-[calc(100vh-80px)]">
      {/* Filters Sidebar */}
      <aside className="w-72 p-6 border-r border-border">
        <h1 className="text-2xl font-bold text-primary mb-6">Find Tutors</h1>

        {/* Subject Filter */}
        <div className="mb-6">
          <h3 className="font-bold text-primary mb-3">Subject</h3>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-full bg-card"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="Math">Math</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Coding">Coding</SelectItem>
              <SelectItem value="Others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border my-4" />

        {/* Level Filter */}
        <div className="mb-6">
          <h3 className="font-bold text-primary mb-3">Level</h3>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full bg-card"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Elementary">Elementary</SelectItem>
              <SelectItem value="Junior High School">Junior High School</SelectItem>
              <SelectItem value="High School">High School</SelectItem>
              <SelectItem value="University">University</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border my-4" />

        {/* Availability Filter */}
        <div className="mb-6">
          <h3 className="font-bold text-primary mb-3">Availability</h3>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="w-full bg-card mb-3"><SelectValue placeholder="Any Day" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Day</SelectItem>
              <SelectItem value="monday">Monday</SelectItem>
              <SelectItem value="tuesday">Tuesday</SelectItem>
              <SelectItem value="wednesday">Wednesday</SelectItem>
              <SelectItem value="thursday">Thursday</SelectItem>
              <SelectItem value="friday">Friday</SelectItem>
              <SelectItem value="saturday">Saturday</SelectItem>
              <SelectItem value="sunday">Sunday</SelectItem>
            </SelectContent>
          </Select>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger className="w-full bg-card"><SelectValue placeholder="Any Time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Time</SelectItem>
              <SelectItem value="morning">Morning (06:00 - 12:00)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12:00 - 18:00)</SelectItem>
              <SelectItem value="evening">Evening (18:00 - 24:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border my-4" />

        {/* Price Filter */}
        <div>
          <h3 className="font-bold text-primary mb-3">Price</h3>
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-full bg-card"><SelectValue placeholder="Any Price" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Price</SelectItem>
              <SelectItem value="0-50">Rp 0 - Rp 50.000</SelectItem>
              <SelectItem value="50-100">Rp 50.000 - Rp 100.000</SelectItem>
              <SelectItem value="100-150">Rp 100.000 - Rp 150.000</SelectItem>
              <SelectItem value="150-200">Rp 150.000 - Rp 200.000</SelectItem>
              <SelectItem value="200+">Rp 200.000+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filter Button */}
        <div className="mt-8">
          <Button 
            variant="outline" 
            className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={() => {
              setSubject("all")
              setLevel("all")
              setDay("all")
              setTime("all")
              setPriceRange("all")
            }}
          >
            Reset Filters
          </Button>
        </div>
      </aside>

      {/* Tutors List */}
      <div className="flex-1 p-6">
        <h2 className="text-xl font-bold text-primary mb-6">
          Showing {tutors.length} {tutors.length === 1 ? 'Tutor' : 'Tutors'} For {
            subject === "all" ? "All Subjects" : subject.charAt(0).toUpperCase() + subject.slice(1)
          }
        </h2>

        {isLoading ? (
          <div className="text-center text-primary font-bold mt-12">Loading Tutors...</div>
        ) : tutors.length === 0 ? (
          <div className="text-center text-muted-foreground mt-12">No tutors match your exact filters. Try adjusting them!</div>
        ) : (
          <div className="space-y-4">
            {tutors.map((tutor) => (
              <Card key={tutor.id}>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={tutor.image} alt={tutor.name} width={96} height={96} className="object-cover w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-primary">{tutor.name}</h3>
                      <p className="text-primary">{tutor.subject} · {tutor.level}</p>
                      <p className="text-sm text-primary whitespace-pre-line mt-1 line-clamp-2">{tutor.description}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-4 h-4", i < tutor.rating ? "fill-[#344675] text-[#344675]" : "fill-gray-200 text-gray-200")} />
                        ))}
                        <span className="text-[#344675] font-semibold ml-1">({tutor.reviewCount})</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between">
                      <div>
                        <p className="text-xl font-bold text-primary">Rp {tutor.price.toLocaleString('id-ID')}</p>
                        <p className="text-sm text-primary">/ Class</p>
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full border-primary text-primary" asChild>
                          <Link href={`/student/find-tutors/${tutor.user_id}`}>View Profile</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}