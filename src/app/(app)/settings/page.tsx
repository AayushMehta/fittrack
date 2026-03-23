import { auth } from '@/lib/auth'
import { getProfile } from '@/lib/services/settings'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const session = await auth()
  const profile = await getProfile(session!.user!.id!)

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsClient profile={profile} />
    </div>
  )
}
