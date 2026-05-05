import { Users, Calendar, Clock } from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Find The Right Match",
    description: "Connect With Tutors Or Students That Fit Your Goals, Learning Style, And Schedule",
  },
  {
    icon: Calendar,
    title: "Teach With Flexibility",
    description: "Set Your Availability, Choose Your Subjects, And Teach In A Way That Works For You",
  },
  {
    icon: Clock,
    title: "Simple Scheduling",
    description: "Book, Reschedule, And Manage Sessions Easily Our Intuitive Scheduling Tools",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-16 px-6 md:px-12 bg-card">
      <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-12">
        Why Choose STEP-UP?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <div key={index} className="flex flex-col items-start p-6 bg-background rounded-xl border border-border">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="bg-secondary text-secondary-foreground px-4 py-1 rounded-full text-sm font-medium">
                {feature.title}
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
