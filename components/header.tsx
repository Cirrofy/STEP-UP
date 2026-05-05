import Link from "next/link"
import { StepUpLogo } from "./step-up-logo"

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 md:px-12">
      <StepUpLogo />
      <nav className="flex items-center gap-8">
        <Link 
          href="/login" 
          className="text-primary font-medium hover:underline"
        >
          Login
        </Link>
        <Link 
          href="/register" 
          className="text-primary font-medium hover:underline"
        >
          Register
        </Link>
      </nav>
    </header>
  )
}
