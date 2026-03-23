import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function toISODate(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function parseISODate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}
