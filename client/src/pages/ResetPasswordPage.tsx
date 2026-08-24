import { Link, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/features/auth/validations/reset-password.schema"
import { useResetPassword } from "@/features/auth/hooks/useResetPassword"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""
  const resetPasswordMutation = useResetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate({
      token,
      password: data.password,
    })
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">
              Invalid Link
            </CardTitle>
            <CardDescription>
              This password reset link is invalid or missing a token. Please
              request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/forgot-password">
              <Button>Request New Link</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Reset Password
          </CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>

        <CardContent>
          {resetPasswordMutation.isError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {isAxiosError(resetPasswordMutation.error)
                  ? resetPasswordMutation.error.response?.data?.message ||
                    "Something went wrong. Please try again."
                  : "Something went wrong. Please try again."}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? "Resetting..."
                : "Reset Password"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-foreground hover:underline"
            >
              Back to Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
