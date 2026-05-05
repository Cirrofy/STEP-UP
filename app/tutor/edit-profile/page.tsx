"use client"

// 1. Tambahkan Suspense dari react
import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Plus, Trash2, Camera, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const timeSlots = [
  "00.00", "01.00", "02.00", "03.00", "04.00", "05.00", "06.00", "07.00", "08.00",
  "09.00", "10.00", "11.00", "12.00", "13.00", "14.00", "15.00", "16.00", "17.00",
  "18.00", "19.00", "20.00", "21.00", "22.00", "23.00"
]
const daysMap: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const reverseDaysMap = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type ResumeItem = { id?: string, time_period: string, description: string }

// 2. Ubah nama komponen utama menjadi EditProfileContent
function EditProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSetupMode = searchParams.get("setup") === "true"

  const supabase = createClient()
  const { toast } = useToast()
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  // Standard Form States
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [description, setDescription] = useState("")
  const [aboutYou, setAboutYou] = useState("")
  const [profileVideo, setProfileVideo] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop")
  
  // Dropdown & Number States
  const [subjectTaught, setSubjectTaught] = useState("")
  const [educationLevel, setEducationLevel] = useState("")
  const [pricePerHour, setPricePerHour] = useState<number | "">("")
  const [yearsExperience, setYearsExperience] = useState<number | "">("")

  // Array of Text States
  const [specializations, setSpecializations] = useState<string[]>([""])
  const [languages, setLanguages] = useState<string[]>([""])

  // Dynamic Resume & Calendar States
  const [educations, setEducations] = useState<ResumeItem[]>([{ time_period: "", description: "" }])
  const [certifications, setCertifications] = useState<ResumeItem[]>([{ time_period: "", description: "" }])
  const [availability, setAvailability] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const currentUserId = session.user.id
        setUserId(currentUserId)

        const { data: userData } = await supabase.from('users').select('full_name, avatar_url').eq('id', currentUserId).single()
        if (userData) {
          setName(userData.full_name || "")
          if (userData.avatar_url) setAvatarUrl(userData.avatar_url)
        }

        const { data: profileData } = await supabase.from('tutor_profiles').select('*').eq('user_id', currentUserId).maybeSingle()

        if (profileData) {
          setProfileId(profileData.id)
          setSubjectTaught(profileData.subject_taught || "")
          setEducationLevel(profileData.education_level || "")
          setCity(profileData.city || "")
          setDescription(profileData.short_description || "")
          setAboutYou(profileData.about_me || "")
          setProfileVideo(profileData.profile_video_url || "")
          
          if (profileData.price_per_hour) setPricePerHour(Number(profileData.price_per_hour))
          if (profileData.years_experience) setYearsExperience(Number(profileData.years_experience))

          if (profileData.specializations?.length) setSpecializations(profileData.specializations)
          if (profileData.languages?.length) setLanguages(profileData.languages)

          const { data: resumes } = await supabase.from('tutor_resumes').select('*').eq('tutor_id', profileData.id)
          if (resumes) {
            const edu = resumes.filter(r => r.type === 'education').map(r => ({ id: r.id, time_period: r.time_period, description: r.description }))
            const cert = resumes.filter(r => r.type === 'certification').map(r => ({ id: r.id, time_period: r.time_period, description: r.description }))
            if (edu.length > 0) setEducations(edu)
            if (cert.length > 0) setCertifications(cert)
          }

          const { data: availData } = await supabase.from('tutor_availabilities').select('*').eq('tutor_id', profileData.id)
          if (availData) {
            const newAvailability: Record<string, string[]> = {}
            availData.forEach(slot => {
              const dayName = reverseDaysMap[slot.day_of_week]
              const timeFormatted = slot.time_slot.substring(0, 5).replace(':', '.')
              if (!newAvailability[dayName]) newAvailability[dayName] = []
              newAvailability[dayName].push(timeFormatted)
            })
            setAvailability(newAvailability)
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfileData()
  }, [supabase])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      if (!userId) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}` 
      const filePath = `${fileName}`

      setIsUploading(true)

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(publicUrl)
      toast({ title: "Image Uploaded!", description: "Don't forget to save your profile." })

    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  const toggleTimeSlot = (day: string, time: string) => {
    setAvailability(prev => {
      const daySlots = prev[day] || []
      if (daySlots.includes(time)) return { ...prev, [day]: daySlots.filter(t => t !== time) }
      else return { ...prev, [day]: [...daySlots, time] }
    })
  }

  const updateArrayItem = (type: 'spec' | 'lang', index: number, value: string) => {
    if (type === 'spec') { const newArr = [...specializations]; newArr[index] = value; setSpecializations(newArr); }
    else { const newArr = [...languages]; newArr[index] = value; setLanguages(newArr); }
  }
  const addArrayItem = (type: 'spec' | 'lang') => {
    if (type === 'spec') setSpecializations([...specializations, ""])
    else setLanguages([...languages, ""])
  }
  const removeArrayItem = (type: 'spec' | 'lang', index: number) => {
    if (type === 'spec') setSpecializations(specializations.filter((_, i) => i !== index))
    else setLanguages(languages.filter((_, i) => i !== index))
  }

  const updateResume = (type: 'edu' | 'cert', index: number, field: keyof ResumeItem, value: string) => {
    if (type === 'edu') { const newEdu = [...educations]; newEdu[index][field] = value; setEducations(newEdu); }
    else { const newCert = [...certifications]; newCert[index][field] = value; setCertifications(newCert); }
  }
  const addResume = (type: 'edu' | 'cert') => {
    if (type === 'edu') setEducations([...educations, { time_period: "", description: "" }])
    else setCertifications([...certifications, { time_period: "", description: "" }])
  }
  const removeResume = (type: 'edu' | 'cert', index: number) => {
    if (type === 'edu') setEducations(educations.filter((_, i) => i !== index))
    else setCertifications(certifications.filter((_, i) => i !== index))
  }

  const handleSaveProfile = async () => {
    if (!userId) { toast({ variant: "destructive", title: "Error", description: "You are not logged in!" }); return }

    // --- VALIDASI WAJIB ONBOARDING ---
    const isAvailabilityEmpty = Object.values(availability).every(daySlots => daySlots.length === 0)
    
    if (!subjectTaught || !educationLevel || !pricePerHour || pricePerHour <= 0 || yearsExperience === "" || yearsExperience < 0 || isAvailabilityEmpty) {
      toast({ 
        variant: "destructive", 
        title: "Incomplete Profile", 
        description: "Please fill in your Subject, Level, Hourly Rate, Experience, and at least 1 Schedule Availability before saving." 
      })
      return
    }

    setIsSaving(true)

    try {
      await supabase.from('users').update({ full_name: name, avatar_url: avatarUrl }).eq('id', userId)

      let currentProfileId = profileId
      const cleanSpecializations = specializations.filter(s => s.trim() !== "")
      const cleanLanguages = languages.filter(s => s.trim() !== "")

      const profilePayload = {
        subject_taught: subjectTaught,
        education_level: educationLevel,
        specializations: cleanSpecializations,
        languages: cleanLanguages,
        city: city,
        price_per_hour: pricePerHour,
        years_experience: yearsExperience,
        short_description: description,
        about_me: aboutYou,
        profile_video_url: profileVideo
      }

      if (!currentProfileId) {
        const { data: newProfile, error: insertError } = await supabase
          .from('tutor_profiles')
          .insert({ user_id: userId, ...profilePayload })
          .select().single()
        if (insertError) throw insertError
        currentProfileId = newProfile.id
        setProfileId(currentProfileId)
      } else {
        const { error: updateError } = await supabase.from('tutor_profiles').update(profilePayload).eq('id', currentProfileId)
        if (updateError) throw updateError
      }

      await supabase.from('tutor_resumes').delete().eq('tutor_id', currentProfileId)
      const resumeInserts = [
        ...educations.filter(e => e.time_period || e.description).map(e => ({ tutor_id: currentProfileId, type: 'education', time_period: e.time_period, description: e.description })),
        ...certifications.filter(c => c.time_period || c.description).map(c => ({ tutor_id: currentProfileId, type: 'certification', time_period: c.time_period, description: c.description }))
      ]
      if (resumeInserts.length > 0) await supabase.from('tutor_resumes').insert(resumeInserts)

      await supabase.from('tutor_availabilities').delete().eq('tutor_id', currentProfileId)
      const availabilityInserts: any[] = []
      Object.entries(availability).forEach(([day, times]) => {
        const dayOfWeek = daysMap[day]
        times.forEach(time => {
          availabilityInserts.push({ tutor_id: currentProfileId, day_of_week: dayOfWeek, time_slot: `${time.replace('.', ':')}:00` })
        })
      })
      if (availabilityInserts.length > 0) await supabase.from('tutor_availabilities').insert(availabilityInserts)

      toast({ title: "Profile Saved!", description: "Your profile has been updated successfully." })
      
      if (isSetupMode) {
        setTimeout(() => router.push('/tutor'), 1500)
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Saving Profile", description: error?.message || "Failed to save." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading...</div>

  return (
    <main className="px-6 py-8 md:px-12 max-w-6xl mx-auto">
      {isSetupMode && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold">Welcome to STEP-UP!</h3>
            <p className="text-sm">Before you can start teaching and access your dashboard, please complete your profile. The fields marked with an asterisk (*) are mandatory.</p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-[#344675] text-center mb-8">{isSetupMode ? "Complete Your Profile" : "Edit Profile"}</h1>

      <div className="flex flex-col items-center justify-center mb-10">
        <div 
          className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-[#e8f1f8] shadow-md group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Image src={avatarUrl} alt="Profile" width={144} height={144} className="object-cover w-full h-full" />
          <div className="absolute inset-0 bg-[#344675]/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white mb-1" />
            <span className="text-white text-xs font-bold">Change</span>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-[#344675]/80 flex flex-col items-center justify-center">
              <span className="text-white text-sm font-bold animate-pulse">Uploading...</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-3 font-medium">Click to update your photo</p>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block font-bold text-[#344675] mb-2">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white border-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#344675] mb-2">Subject Taught *</label>
              <Select value={subjectTaught} onValueChange={setSubjectTaught}>
                <SelectTrigger className="w-full bg-white border-gray-200">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
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
            <div>
              <label className="block font-bold text-[#344675] mb-2">Education Level *</label>
              <Select value={educationLevel} onValueChange={setEducationLevel}>
                <SelectTrigger className="w-full bg-white border-gray-200">
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Elementary">Elementary</SelectItem>
                  <SelectItem value="Junior High School">Junior High School</SelectItem>
                  <SelectItem value="High School">High School</SelectItem>
                  <SelectItem value="University">University</SelectItem>
                  <SelectItem value="Public">Public (All Ages)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block font-bold text-[#344675] mb-2 text-sm whitespace-nowrap">Experience (Years) *</label>
              <Input 
                type="number" 
                value={yearsExperience} 
                onChange={(e) => setYearsExperience(e.target.value === "" ? "" : Number(e.target.value))} 
                className="bg-white border-gray-200" 
                min={0}
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-[#344675] mb-2 text-sm">Hourly Rate (Rp) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">Rp</span>
                <Input 
                  type="number" 
                  value={pricePerHour} 
                  onChange={(e) => setPricePerHour(e.target.value === "" ? "" : Number(e.target.value))} 
                  className="bg-white border-gray-200 pl-10" 
                  min={0}
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block font-bold text-[#344675] mb-2">City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-white border-gray-200" />
          </div>

          <div>
            <label className="block font-bold text-[#344675] mb-2">Specializations</label>
            {specializations.map((spec, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input value={spec} onChange={(e) => updateArrayItem('spec', index, e.target.value)} placeholder="e.g. Algebra, UI/UX, etc." className="bg-white border-gray-200 flex-1" />
                {specializations.length > 1 && (
                  <Button variant="outline" size="icon" onClick={() => removeArrayItem('spec', index)} className="shrink-0 text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4"/></Button>
                )}
              </div>
            ))}
            <Button onClick={() => addArrayItem('spec')} variant="outline" size="sm" className="w-full mt-1 border-dashed text-[#7492c9] border-[#7492c9] hover:bg-[#d4e1f4]">
              <Plus className="w-4 h-4 mr-1" /> Add Specialization
            </Button>
          </div>

          <div>
            <label className="block font-bold text-[#344675] mb-2">Languages</label>
            {languages.map((lang, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input value={lang} onChange={(e) => updateArrayItem('lang', index, e.target.value)} placeholder="e.g. English (Fluent)" className="bg-white border-gray-200 flex-1" />
                {languages.length > 1 && (
                  <Button variant="outline" size="icon" onClick={() => removeArrayItem('lang', index)} className="shrink-0 text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4"/></Button>
                )}
              </div>
            ))}
            <Button onClick={() => addArrayItem('lang')} variant="outline" size="sm" className="w-full mt-1 border-dashed text-[#7492c9] border-[#7492c9] hover:bg-[#d4e1f4]">
              <Plus className="w-4 h-4 mr-1" /> Add Language
            </Button>
          </div>

          <div>
            <label className="block font-bold text-[#344675] mb-2">Tagline / Short Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white border-gray-200 min-h-[80px]" placeholder="A short catchy phrase..." />
          </div>
          <div>
            <label className="block font-bold text-[#344675] mb-2">About You</label>
            <Textarea value={aboutYou} onChange={(e) => setAboutYou(e.target.value)} className="bg-white border-gray-200 min-h-[120px]" placeholder="Tell students more about your teaching style..." />
          </div>
          <div>
            <label className="block font-bold text-[#344675] mb-2">Profile Video URL</label>
            <Input value={profileVideo} onChange={(e) => setProfileVideo(e.target.value)} placeholder="https://youtube.com/..." className="bg-white border-gray-200" />
          </div>
        </div>

        {/* Right Column - Resume */}
        <div className="space-y-6">
          <div className="bg-[#f4f7f9] p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-[#344675] text-xl mb-4">Resume & Background</h3>
            
            <p className="text-[#7492c9] font-bold mb-3">Education</p>
            {educations.map((edu, index) => (
              <Card key={index} className="mb-3 relative group border-none shadow-sm">
                <CardContent className="p-4 pr-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-[#344675]">{index + 1}</span>
                    <Input placeholder="Time (e.g. 2014-2018)" value={edu.time_period} onChange={(e) => updateResume('edu', index, 'time_period', e.target.value)} className="bg-white border-gray-200" />
                  </div>
                  <Input placeholder="Institution / Degree" value={edu.description} onChange={(e) => updateResume('edu', index, 'description', e.target.value)} className="bg-white border-gray-200" />
                  {educations.length > 1 && (
                    <button onClick={() => removeResume('edu', index)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => addResume('edu')} variant="outline" className="border-[#344675] text-[#344675] hover:bg-[#d4e1f4] w-full mb-6 font-bold">
              <Plus className="w-4 h-4 mr-2" /> Add Education
            </Button>

            <p className="text-[#7492c9] font-bold mb-3 mt-6">Certifications</p>
            {certifications.map((cert, index) => (
              <Card key={index} className="mb-3 relative group border-none shadow-sm">
                <CardContent className="p-4 pr-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-[#344675]">{index + 1}</span>
                    <Input placeholder="Time (e.g. 2020)" value={cert.time_period} onChange={(e) => updateResume('cert', index, 'time_period', e.target.value)} className="bg-white border-gray-200" />
                  </div>
                  <Input placeholder="Certification Details" value={cert.description} onChange={(e) => updateResume('cert', index, 'description', e.target.value)} className="bg-white border-gray-200" />
                  {certifications.length > 1 && (
                    <button onClick={() => removeResume('cert', index)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => addResume('cert')} variant="outline" className="border-[#344675] text-[#344675] hover:bg-[#d4e1f4] w-full font-bold">
              <Plus className="w-4 h-4 mr-2" /> Add Certifications
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Matrix */}
      <div className="mt-10">
        <h3 className="font-bold text-[#344675] text-xl mb-2">Weekly Schedule Availability *</h3>
        <p className="text-gray-500 mb-6 font-medium">Select the hours you are typically available to teach each week. (Required)</p>
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f7f9] border-b border-gray-100">
                <tr>
                  <th className="py-4 px-4 text-left text-[#344675] font-bold min-w-[80px]">Time</th>
                  {days.map((day) => <th key={day} className="py-4 px-2 text-center text-[#344675] font-bold min-w-[100px] uppercase tracking-wider text-xs">{day}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {timeSlots.map((time) => (
                  <tr key={time} className="hover:bg-gray-50/50">
                    <td className="py-2 px-4 text-[#7492c9] font-bold">{time}</td>
                    {days.map((day) => {
                      const isSelected = availability[day]?.includes(time)
                      return (
                        <td key={day} className="py-1 text-center px-1">
                          <button
                            onClick={() => toggleTimeSlot(day, time)}
                            className={cn(
                              "w-full rounded-md py-2 transition-all font-semibold",
                              isSelected ? "bg-[#7492c9] text-white shadow-sm" : "text-gray-400 hover:bg-gray-200/50"
                            )}
                          >
                            {time}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-12 mb-8 border-t border-gray-200 pt-8">
        <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-[#7492c9] text-white hover:bg-[#5b78b0] px-16 h-14 text-lg font-bold rounded-full shadow-md">
          {isSaving ? "Saving..." : "Save Profile & Schedule"}
        </Button>
      </div>
    </main>
  )
}

// 3. Buat pembungkus Suspense di ekspor utama
export default function EditProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading Editor...</div>}>
      <EditProfileContent />
    </Suspense>
  )
}