import { AppNav } from '@/components/layout/app-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="ml-56 flex-1 p-6">{children}</main>
    </div>
  )
}
