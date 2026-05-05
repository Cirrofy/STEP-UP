import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-16 px-6 md:px-12 bg-card">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Ready To Get Started?
        </h2>
        <p className="text-foreground text-lg mb-8">
          Join STEP-UP Today And Start Learning Or Teaching
        </p>
        <Link href="/register">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 rounded-lg text-lg">
            Get Started
          </Button>
        </Link>
      </div>
    </section>
  )
}
