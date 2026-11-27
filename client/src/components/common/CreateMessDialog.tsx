import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/common/ui-kit"
import { CURRENCY_SYMBOL } from "@/lib/currency"
import { toast } from "@/components/common/toast"
import { useCreateMess } from "@/features/mess/hooks/useMess"

export function CreateMessDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateMess()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: "", address: "", rent: "" })
  const [error, setError] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name.trim()) return setError("Give your mess a name.")
    const rent = form.rent === "" ? 0 : Number(form.rent)
    if (Number.isNaN(rent) || rent < 0) return setError("Rent must be 0 or more.")
    create.mutate(
      { name: form.name.trim(), address: form.address.trim() || undefined, rentAmount: rent },
      {
        onSuccess: (mess) => {
          toast.success("Mess created. Now invite your flatmates.")
          setForm({ name: "", address: "", rent: "" })
          onOpenChange(false)
          navigate(`/mess/${mess.id}/members`)
        },
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a mess</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Mess name" htmlFor="mess-name">
            <Input id="mess-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Green View Mess" />
          </Field>
          <Field label="Address (optional)" htmlFor="mess-address">
            <Input id="mess-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. House 12, Road 5, Mirpur" />
          </Field>
          <Field label={`Your room rent (${CURRENCY_SYMBOL}/month)`} htmlFor="mess-rent" hint="You'll be the manager. You can set everyone's rent later on the Members page.">
            <Input id="mess-rent" inputMode="decimal" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} placeholder="0" />
          </Field>
          {error && <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create mess"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
