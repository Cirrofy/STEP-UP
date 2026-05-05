"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Check, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const subjects = [
  {
    id: "mathematics",
    name: "Mathematics",
    icon: (
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-2xl text-blue-500">+−×÷</span>
      </div>
    ),
    color: "bg-blue-100",
  },
  {
    id: "physics",
    name: "Physics",
    icon: (
      <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-cyan-500" fill="currentColor">
          <circle cx="12" cy="12" r="3" />
          <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 12 12)" />
        </svg>
      </div>
    ),
    color: "bg-cyan-100",
  },
  {
    id: "biology",
    name: "Biology",
    icon: (
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-500" fill="currentColor">
          <path d="M12 3c-1.5 3-4 5-7 6 0 5 3 10 7 12 4-2 7-7 7-12-3-1-5.5-3-7-6z" />
        </svg>
      </div>
    ),
    color: "bg-green-100",
  },
  {
    id: "chemistry",
    name: "Chemistry",
    icon: (
      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-purple-500" fill="currentColor">
          <path d="M6 3h12v2H6V3zm1 4h10l3 12H4L7 7zm5 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      </div>
    ),
    color: "bg-purple-100",
  },
  {
    id: "english",
    name: "English",
    icon: (
      <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-sky-500" fill="currentColor">
          <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
        </svg>
      </div>
    ),
    color: "bg-sky-100",
  },
  {
    id: "coding",
    name: "Coding",
    icon: (
      <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
        <span className="text-xl text-violet-500 font-mono">{"</>"}</span>
      </div>
    ),
    color: "bg-violet-100",
  },
]

export default function ChooseSubjectPage() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState<string | null>("mathematics")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleContinue = () => {
    if (selectedSubject) {
      router.push(`/student/find-tutors?subject=${selectedSubject}`)
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-6 py-8 md:px-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary italic">
          What Subject Would You Like To Learn?
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose A Subject To Start Finding The Right Tutor
        </p>
      </div>

      <Card className="max-w-5xl mx-auto">
        <CardContent className="p-8">
          <div className="flex gap-8">
            {/* Subject Selection */}
            <div className="flex-1">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="px-1.5 py-0.5 bg-muted rounded">⌘</span>
                  <span className="px-1.5 py-0.5 bg-muted rounded">K</span>
                </div>
              </div>

              {/* Subject Grid */}
              <div className="grid grid-cols-3 gap-4">
                {filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject.id)}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all hover:border-primary",
                      selectedSubject === subject.id
                        ? "border-primary bg-blue-50"
                        : "border-border"
                    )}
                  >
                    {selectedSubject === subject.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-3 relative">
                      {selectedSubject === subject.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {subject.icon}
                      <span className="font-medium text-primary">{subject.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Continue Button */}
              <Button
                onClick={handleContinue}
                disabled={!selectedSubject}
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue To Find Tutors
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Divider */}
            <div className="w-px bg-border" />

            {/* Selected Subject Info */}
            <div className="w-64">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="text-primary font-bold mb-4">Selected subject</h4>
                  {selectedSubject && (
                    <div className="flex items-center gap-3">
                      {subjects.find((s) => s.id === selectedSubject)?.icon}
                      <span className="font-bold text-primary capitalize">
                        {selectedSubject}
                      </span>
                    </div>
                  )}
                  <div className="mt-6 flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Next, we&apos;ll show matching tutors and you can apply filters there.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-center mt-8">
        <Button
          variant="outline"
          className="w-64 border-primary text-primary"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
    </main>
  )
}
