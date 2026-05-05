import Link from "next/link"
import { Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="px-6 py-12 md:px-12 md:py-16">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-bold text-primary leading-tight">
            <span className="font-light">Learn And Teach</span>
            <br />
            With <span className="font-bold">STEP-UP</span>
          </h1>
          <p className="mt-4 text-foreground text-lg">
            STEP-UP Connect Students With Expert Tutors & Helps Tutors Share Their Knowledge, Anytime, Anywhere.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link href="/login?role=student">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md flex items-center gap-2">
                <Search className="w-4 h-4" />
                Find A Tutor
              </Button>
            </Link>
            <Link href="/login?role=tutor">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 px-6 py-2 rounded-md flex items-center gap-2">
                <Users className="w-4 h-4" />
                Become A Tutor
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-md">
            {/* Illustration placeholder - video call interface */}
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-border">
              <div className="bg-muted rounded-xl p-6 flex flex-col items-center">
                {/* Mock video call UI */}
                <div className="w-full aspect-video bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Main person */}
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                      <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Tutor</div>
                  </div>
                  {/* Small participant */}
                  <div className="absolute top-2 right-2 w-16 h-12 bg-white rounded-lg shadow flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  {/* Math symbols decoration */}
                  <div className="absolute top-2 left-2 text-primary/30 text-xs">A = πr²</div>
                  <div className="absolute bottom-2 right-2 text-primary/30 text-xs">∫ dx</div>
                </div>
                {/* Video call controls */}
                <div className="flex gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-400 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                    </svg>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
