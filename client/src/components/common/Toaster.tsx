import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToastStore } from "./toast"

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex max-w-md items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg",
            t.tone === "success" ? "bg-foreground text-background" : "bg-danger text-white"
          )}
        >
          {t.tone === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}
