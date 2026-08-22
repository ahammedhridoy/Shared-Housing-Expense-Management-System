import { useAuthStore } from "@/stores/auth.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Shield, Calendar } from "lucide-react"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Profile</h1>

      {/* Avatar + Name Card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-24">Name</span>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-24">Email</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-24">Role</span>
            <span className="text-sm font-medium capitalize">{user.role.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-24">Joined</span>
            <span className="text-sm font-medium">{formatDate(user.createdAt)}</span>
          </div>
          {user.updatedAt !== user.createdAt && (
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground w-24">Updated</span>
              <span className="text-sm font-medium">{formatDate(user.updatedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
