import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code2, ShieldCheck, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Code2 className="h-5 w-5" />
            </div>
            <span>AI Code Review</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-white/10">
                Log In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-neutral-200 font-medium">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center md:pt-40">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-400 backdrop-blur-lg mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
          Now with Local LLM Support
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          Code Review at the <br /> Speed of Thought
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-neutral-400 md:text-xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          Automate your code reviews with AI. Catch bugs early, enforce standards, and ship faster. Securely connects with GitHub and GitLab.
        </p>

        <div className="mt-10 flex gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
          <Link href="/login">
            <Button size="lg" className="h-12 bg-blue-600 px-8 text-base hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Start Reviewing <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="https://github.com" target="_blank">
            <Button size="lg" variant="outline" className="h-12 border-white/10 bg-white/5 text-base hover:bg-white/10 text-white">
              View Demo
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-32 grid gap-8 md:grid-cols-3 max-w-6xl w-full px-4 animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-yellow-400" />}
            title="Instant Feedback"
            description="Get AI-powered comments on your PRs in seconds, not hours."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6 text-green-400" />}
            title="Privacy First"
            description="Run deep analysis locally with Ollama support. Your code stays yours."
          />
          <FeatureCard
            icon={<Code2 className="h-6 w-6 text-blue-400" />}
            title="Multi-Platform"
            description="Seamless integration with GitHub, GitLab, and Bitbucket."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-8 text-center text-sm text-neutral-500">
        <p>© 2026 AI Code Review. Built with Vibe.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-neutral-900/50 p-8 text-left transition-colors hover:bg-neutral-800/50">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      <p className="text-neutral-400">{description}</p>
    </div>
  )
}
