import { AppNav } from '@/components/layout/app-nav'
import { AISidebar } from '@/components/ai/AISidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="flex-1 min-w-0 overflow-y-auto p-6 pr-0">{children}</main>
      <div className="sticky top-0 h-screen shrink-0">
        <AISidebar />
      </div>
    </div>
  )
}
