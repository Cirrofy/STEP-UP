"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, KeyRound, Eye, EyeOff, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StepUpLogo } from "@/components/step-up-logo"

// Import client Supabase dan hook toast
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type UserRole = "student" | "tutor"

// 1. Ubah nama fungsi asli menjadi LoginContent (Hapus export default)
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = searchParams.get("role") as UserRole || "student"
  
  const [role, setRole] = useState<UserRole>(initialRole)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  // Tambahkan state loading dan inisialisasi hooks
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Proses login menggunakan Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      // 2. Ambil role asli dari metadata user untuk memastikan routing yang akurat
      // (Data ini kita simpan saat Register sebelumnya)
      const actualRole = data.user.user_metadata.role || role

      // 3. Tampilkan notifikasi sukses
      toast({
        title: "Login Successful!",
        description: "Welcome back to STEP-UP.",
      })

      // 4. Redirect sesuai role asli dari database
      if (actualRole === "student") {
        router.push("/student") // Mengarah ke dashboard student
      } else {
        router.push("/tutor") // Mengarah ke dashboard tutor
      }

    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message === "Invalid login credentials" 
          ? "Email atau password salah. Silakan coba lagi." 
          : error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const subtitle = role === "student" 
    ? "Login To Continue Your Learning Journey"
    : "Login To Manage Your Tutoring Schedule"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with logo */}
      <div className="p-6">
        <StepUpLogo />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
            {/* User Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-primary text-center mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              {subtitle}
            </p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input border-border rounded-lg h-12"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-input border-border rounded-lg h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Login As
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      role === "student"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-input text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("tutor")}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      role === "tutor"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-input text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    Tutor
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-lg font-medium h-12"
                disabled={isLoading}
              >
                Login
              </Button>

              {/* Forgot Password */}
              <div className="text-center">
                <Link href="#" className="text-primary font-medium hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </form>

            {/* Divider */}
            <div className="my-6 border-t border-border"></div>

            {/* Register Link */}
            <p className="text-center text-foreground">
              {"Don't Have An Account? "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Register Here
              </Link>
            </p>
          </div>

          {/* Back Button */}
          <div className="mt-8">
            <Link href="/">
              <Button
                variant="outline"
                className="w-full border-border text-primary hover:bg-muted py-3 rounded-full h-12"
              >
                Back
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// 2. Buat fungsi export default baru yang membungkus LoginContent dengan Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary font-medium">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}