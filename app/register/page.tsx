"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, KeyRound, Eye, EyeOff, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StepUpLogo } from "@/components/step-up-logo"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

// Mengimpor gambar langsung dari folder components sesuai struktur folder Anda
import registerImg from "@/components/register_img.png"

type UserRole = "student" | "tutor"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = (searchParams.get("role") as UserRole) || "student"

  const [role, setRole] = useState<UserRole>(initialRole)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Tambahkan state loading
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
      })
      return
    }

    setIsLoading(true)

    try {
      // 1. Gunakan supabase.auth.signUp, BUKAN insert ke public.users
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            role: role, // Menyisipkan data tambahan di metadata
          }
        }
      })

      if (error) throw error

      // 2. Notifikasi sukses
      toast({
        title: "Registration Successful!",
        description: `Welcome to STEP-UP, ${fullName}.`,
      })

      // 3. Redirect sesuai role
      if (role === "student") {
        router.push("/student/choose-subject")
      } else {
        router.push("/tutor")
      }

    } catch (error: any) {
      console.error("Register error:", error) // Tambahkan console.log untuk debugging
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const subtitle =
    role === "student"
      ? "Join STEP-UP & Start Your Learning Journey"
      : "Join STEP-UP & Manage Your Tutoring Schedule"

  return (
    // Menggunakan warna background biru muda yang senada dengan desain referensi
    <div className="min-h-screen bg-[#e8f1f8] flex flex-col relative overflow-hidden">
      
      {/* Header with logo (Absolute on Desktop, normal on Mobile) */}
      <div className="p-6 md:absolute md:top-0 md:left-0 z-20">
        <StepUpLogo />
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
          
          {/* Left side - Illustration & Back Button (Hidden on mobile) */}
          <div className="hidden lg:flex flex-col items-center justify-center flex-1 w-full max-w-lg mt-12">
            
            {/* Image Illustration replacing the SVGs */}
            <div className="w-full max-w-md mb-12">
              <Image 
                src={registerImg} 
                alt="Register Illustration" 
                className="w-full h-auto object-contain drop-shadow-xl"
                priority
              />
            </div>

            {/* Back Button Desktop */}
            <Link href="/" className="w-full max-w-[250px]">
              <Button
                variant="outline"
                className="w-full rounded-full border-[#344675] text-[#344675] hover:bg-[#d1def0] py-6 text-base font-semibold transition-all"
              >
                Back
              </Button>
            </Link>
          </div>

          {/* Right side - Form Card */}
          <div className="flex-1 flex justify-center w-full z-10">
            {/* Register Card Panel (White Background as per reference) */}
            <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10 w-full max-w-md border border-gray-100">
              
              {/* Title */}
              <h1 className="text-2xl font-bold text-[#344675] text-center mb-1">
                Create Your Account
              </h1>
              <p className="text-sm text-gray-500 text-center mb-6">
                Join STEP-UP & Start Learning Today
              </p>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#344675] mb-3">
                  Register As
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`py-2 rounded-md text-sm font-medium transition-all duration-200 border ${
                      role === "student"
                        ? "bg-[#d4e1f4] border-[#d4e1f4] text-[#344675] shadow-sm"
                        : "bg-[#f4f7f9] border-[#e2e8f0] text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("tutor")}
                    className={`py-2 rounded-md text-sm font-medium transition-all duration-200 border ${
                      role === "tutor"
                        ? "bg-[#d4e1f4] border-[#d4e1f4] text-[#344675] shadow-sm"
                        : "bg-[#f4f7f9] border-[#e2e8f0] text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    Tutor
                  </button>
                </div>
              </div>

              {/* Subtitle based on role */}
              <p className="text-[#344675] font-semibold text-sm text-center mb-6">
                {subtitle}
              </p>

              {/* Register Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name Field */}
                <div>
                  <label className="block text-sm font-bold text-[#344675] mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter Your Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-[#f4f7f9] border-none text-gray-700 rounded-md h-12 focus-visible:ring-1 focus-visible:ring-[#7492c9]"
                      required
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-bold text-[#344675] mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Enter Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-[#f4f7f9] border-none text-gray-700 rounded-md h-12 focus-visible:ring-1 focus-visible:ring-[#7492c9]"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-bold text-[#344675] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create A Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#f4f7f9] border-none text-gray-700 rounded-md h-12 focus-visible:ring-1 focus-visible:ring-[#7492c9]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-bold text-[#344675] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Your Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#f4f7f9] border-none text-gray-700 rounded-md h-12 focus-visible:ring-1 focus-visible:ring-[#7492c9]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Register Button */}
                <Button
                  type="submit"
                  className="w-full bg-[#7492c9] hover:bg-[#5b78b0] text-white py-3 rounded-md font-semibold h-12 mt-2 transition-all"
                  disabled={isLoading}
                >
                  Register
                </Button>
              </form>

              {/* Divider */}
              <div className="my-6 border-t-2 border-[#e8f1f8]"></div>

              {/* Login Link */}
              <p className="text-center text-sm text-gray-600">
                Already Have An Account?{" "}
                <Link href="/login" className="text-[#344675] font-bold hover:underline">
                  Login Here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button (Only visible on mobile) */}
      <div className="lg:hidden w-full flex justify-center p-6 mb-4">
        <Link href="/" className="w-full max-w-md">
          <Button
            variant="outline"
            className="w-full rounded-full border-[#344675] text-[#344675] hover:bg-[#d1def0] py-6 text-base font-semibold"
          >
            Back
          </Button>
        </Link>
      </div>
    </div>
  )
}