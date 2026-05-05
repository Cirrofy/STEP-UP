import { Check } from "lucide-react"

const studentBenefits = [
  "Find Expert Tutors Across Many Subjects",
  "Explore Tutor Profiles And Reviews",
  "Book Lessons That Fit Your Schedule",
  "Track Your Progress And Achieve Your Goals",
]

const tutorBenefits = [
  "Create Your Profile And Showcase Your Expertise",
  "Set Your Availability And Rates",
  "Reach Motivated Students",
  "Build Your Reputation And Grow Your Impact",
]

export function BenefitsSection() {
  return (
    <section className="py-16 px-6 md:px-12 bg-muted">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* For Students */}
        <div className="bg-card rounded-xl p-8 border border-border">
          <h3 className="text-2xl md:text-3xl font-bold text-primary mb-6">
            For Students
          </h3>
          <ul className="space-y-4">
            {studentBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* For Tutors */}
        <div className="bg-card rounded-xl p-8 border border-border">
          <h3 className="text-2xl md:text-3xl font-bold text-primary mb-6">
            For Tutors
          </h3>
          <ul className="space-y-4">
            {tutorBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
