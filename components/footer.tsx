import Link from "next/link"
import { StepUpLogo } from "./step-up-logo"

const footerLinks = {
  platform: {
    title: "Platform",
    links: [
      { name: "How It Works", href: "#" },
      { name: "Pricing", href: "#" },
      { name: "Reviews", href: "#" },
    ],
  },
  students: {
    title: "For Students",
    links: [
      { name: "Find A Tutor", href: "#" },
      { name: "Subjects", href: "#" },
      { name: "Study Resources", href: "#" },
    ],
  },
  tutors: {
    title: "For Tutors",
    links: [
      { name: "Become A Tutor", href: "#" },
      { name: "Tutor Guides", href: "#" },
      { name: "Help Center", href: "#" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Contact Us", href: "#" },
    ],
  },
}

export function Footer() {
  return (
    <footer className="bg-muted py-12 px-6 md:px-12 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <StepUpLogo/>
            {/* <StepUpLogo showTagline /> */}
          </div>

          {/* Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-primary mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
