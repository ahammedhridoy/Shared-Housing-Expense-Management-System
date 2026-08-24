import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { AlertCircle, CheckCircle } from "lucide-react"
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
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/features/auth/validations/forgot-password.schema"
import { useForgotPassword } from "@/features/auth/hooks/useForgotPassword"

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Forgot Password
          </CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </CardDescription>
        </CardHeader>

        <CardContent>
          {forgotPasswordMutation.isSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="size-4 shrink-0" />
              <span>{forgotPasswordMutation.data?.message}</span>
            </div>
          )}

          {forgotPasswordMutation.isError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {isAxiosError(forgotPasswordMutation.error)
                  ? forgotPasswordMutation.error.response?.data?.message ||
                    "Something went wrong. Please try again."
                  : "Something went wrong. Please try again."}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending
                ? "Sending..."
                : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
