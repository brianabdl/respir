import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { COUNTRIES, flagEmoji, guessDefaultCountry } from "@/lib/countries"
import { cn } from "@/lib/utils"

type PhoneInputProps = {
  id?: string
  name: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
  className?: string
  triggerClassName?: string
  inputClassName?: string
  popoverClassName?: string
  itemClassName?: string
}

function PhoneInput({
  id,
  name,
  required,
  placeholder,
  autoComplete,
  className,
  triggerClassName,
  inputClassName,
  popoverClassName,
  itemClassName,
}: PhoneInputProps) {
  const [iso2, setIso2] = React.useState(() => guessDefaultCountry())
  const [number, setNumber] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const country =
    COUNTRIES.find((candidate) => candidate.iso2 === iso2) ?? COUNTRIES[0]

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      return COUNTRIES
    }

    return COUNTRIES.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(q) ||
        candidate.dialCode.includes(q)
    )
  }, [query])

  const combined = number.trim() ? `${country.dialCode} ${number.trim()}` : ""

  return (
    <div data-slot="phone-input" className={cn("flex gap-2", className)}>
      <input type="hidden" name={name} value={combined} />

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setQuery("")
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 shrink-0 gap-1 px-2", triggerClassName)}
          >
            <span>{flagEmoji(country.iso2)}</span>
            <span className="text-sm">{country.dialCode}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn("w-64 p-0", popoverClassName)}
        >
          <div className="p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country"
              className={cn("h-8", inputClassName)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto border-t">
            {filtered.map((candidate) => (
              <button
                key={candidate.iso2}
                type="button"
                onClick={() => {
                  setIso2(candidate.iso2)
                  setOpen(false)
                  setQuery("")
                }}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                  itemClassName
                )}
              >
                <span>{flagEmoji(candidate.iso2)}</span>
                <span className="flex-1 truncate">{candidate.name}</span>
                <span className="text-muted-foreground">
                  {candidate.dialCode}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        type="tel"
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        className={cn("flex-1", inputClassName)}
      />
    </div>
  )
}

export { PhoneInput }
