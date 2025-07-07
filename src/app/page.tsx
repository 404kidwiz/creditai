import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-primary">
          Welcome to CreditAI
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          AI-powered credit repair and monitoring platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="outline" size="lg" className="px-8">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}