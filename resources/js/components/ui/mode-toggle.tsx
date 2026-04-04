import { useAppearance } from "@/hooks/use-appearance"
import { cn } from "@/lib/utils"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

type ModeToggleProps = {
  className?: string
}

export function ModeToggle({ className }: ModeToggleProps) {
  const { resolvedAppearance, updateAppearance } = useAppearance()
  const isDark = resolvedAppearance === "dark"
  const nextMode = isDark ? "light" : "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-full", className)}
      aria-label="Toggle appearance"
      onClick={() => updateAppearance(nextMode)}
    >
      {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </Button>
  )
}
