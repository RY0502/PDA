import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80)
}

export function parseSectionsFromSummary(
  summary: string,
  defaultTitle: string
): { title: string; items: { text: string }[] }[] {
  const lines = summary
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("```") && !l.endsWith("```"))

  const sections: { title: string; items: { text: string }[] }[] = []
  let current: { title: string; items: { text: string }[] } | null = null

  const hasHeaders = lines.some((line) => line.startsWith("**") && line.endsWith("**"))

  if (hasHeaders) {
    lines.forEach((line) => {
      const t = line
      if (t.startsWith("**") && t.endsWith("**")) {
        if (current) {
          sections.push(current)
        }
        current = { title: t.slice(2, -2), items: [] }
      } else if (current) {
        const text = t.startsWith("*") || t.startsWith("-") ? t.slice(1).trim() : t
        current.items.push({ text })
      }
    })
  } else {
    current = {
      title: defaultTitle,
      items: lines.map((line) => {
        const text = line.startsWith("*") || line.startsWith("-") ? line.slice(1).trim() : line
        return { text }
      }),
    }
  }

  if (current) {
    sections.push(current)
  }

  return sections
}
