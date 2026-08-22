import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">Page not found</p>
        <Link
          to="/"
          className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
