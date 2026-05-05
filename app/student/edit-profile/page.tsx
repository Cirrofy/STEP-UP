"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Camera, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StudentSubmenu } from "@/components/student/student-submenu"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function StudentEditProfilePage() {
  const supabase = createClient()
  const { toast } = useToast()
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop")

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const currentUserId = session.user.id
        setUserId(currentUserId)

        // Ambil data nama dan foto profil dari tabel users
        const { data: userData, error } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', currentUserId)
          .single()

        if (error) throw error

        if (userData) {
          setName(userData.full_name || "")
          if (userData.avatar_url) setAvatarUrl(userData.avatar_url)
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [supabase])

  // --- FUNGSI UNGGAH FOTO ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      if (!userId) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to upload." })
        return
      }

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `student-${userId}-${Date.now()}.${fileExt}` 
      const filePath = `${fileName}`

      setIsUploading(true)

      // Upload ke Supabase Storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Dapatkan URL publik dari foto
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      toast({ title: "Image Uploaded!", description: "Don't forget to save your profile." })

    } catch (error: any) {
      console.error("Upload Error:", error)
      toast({ variant: "destructive", title: "Upload Failed", description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!userId) { 
      toast({ variant: "destructive", title: "Error", description: "You are not logged in!" })
      return 
    }
    
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Name cannot be empty." })
      return
    }

    setIsSaving(true)

    try {
      // Perbarui tabel users dengan nama dan foto baru
      const { error } = await supabase
        .from('users')
        .update({ 
          full_name: name,
          avatar_url: avatarUrl 
        })
        .eq('id', userId)

      if (error) throw error

      toast({ title: "Profile Saved!", description: "Your profile has been updated successfully." })
    } catch (error: any) {
      console.error("Save Error:", error)
      toast({ variant: "destructive", title: "Error Saving Profile", description: error?.message || "Failed to save." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading Profile...</div>
  }

  return (
    <>
      <StudentSubmenu />
      <main className="px-6 py-12 md:px-12 max-w-3xl mx-auto min-h-[calc(100vh-80px)]">
        <h1 className="text-3xl font-bold text-[#344675] text-center mb-8">Edit My Profile</h1>

        <Card className="border-none shadow-md bg-white overflow-hidden">
          <CardContent className="p-8 sm:p-12 flex flex-col items-center">
            
            {/* UI Foto Profil yang Bisa Diklik */}
            <div className="flex flex-col items-center justify-center mb-10">
              <div 
                className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-[#e8f1f8] shadow-md group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image 
                  src={avatarUrl} 
                  alt="Profile" 
                  width={160} 
                  height={160} 
                  className="object-cover w-full h-full" 
                />
                
                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-[#344675]/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white mb-1" />
                  <span className="text-white text-xs font-bold">Change Photo</span>
                </div>

                {/* Loading State Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-[#344675]/80 flex flex-col items-center justify-center">
                    <span className="text-white text-sm font-bold animate-pulse">Uploading...</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-4 font-medium">Click the image to upload a new avatar</p>

              {/* Input file disembunyikan */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
              />
            </div>

            {/* Form Edit Nama */}
            <div className="w-full max-w-md space-y-4">
              <div>
                <label className="block font-bold text-[#344675] mb-2">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </span>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your full name"
                    className="bg-gray-50/50 border-gray-200 pl-10 h-12 text-[#344675] font-medium" 
                  />
                </div>
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="w-full max-w-md mt-10 border-t border-gray-100 pt-8">
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving || isUploading} 
                className="w-full bg-[#7492c9] text-white hover:bg-[#5b78b0] h-12 text-lg font-bold rounded-full shadow-sm transition-all"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

          </CardContent>
        </Card>
      </main>
    </>
  )
}