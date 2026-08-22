import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"

export function TopBar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="shrink-0"
        >
          <Menu className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <span className="text-lg font-semibold text-primary">SplitEase</span>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
