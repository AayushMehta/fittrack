'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  timezone: z.string().min(1),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface Profile {
  id: string
  name: string
  email: string
  timezone: string
}

export function SettingsClient({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const [pwLoading, setPwLoading] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile?.name ?? '', timezone: profile?.timezone ?? 'Asia/Kolkata' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  async function onProfileSubmit(data: ProfileForm) {
    const res = await fetch('/api/settings/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Profile updated!')
      router.refresh()
    } else {
      toast.error('Failed to update profile')
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPwLoading(true)
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success('Password changed!')
        passwordForm.reset()
      } else {
        toast.error(json.error ?? 'Failed to change password')
      }
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <form
        onSubmit={profileForm.handleSubmit(onProfileSubmit)}
        className="rounded-xl border bg-card p-6 shadow-sm space-y-4"
      >
        <h2 className="font-medium">Profile</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" className={inputClass} {...profileForm.register('name')} />
          {profileForm.formState.errors.name && (
            <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="timezone" className="text-sm font-medium">Timezone</label>
          <input id="timezone" className={inputClass} {...profileForm.register('timezone')} />
        </div>

        <button
          type="submit"
          disabled={profileForm.formState.isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {profileForm.formState.isSubmitting ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Password */}
      <form
        onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
        className="rounded-xl border bg-card p-6 shadow-sm space-y-4"
      >
        <h2 className="font-medium">Change Password</h2>

        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
          <div key={field} className="space-y-1">
            <label htmlFor={field} className="text-sm font-medium">
              {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
            </label>
            <input id={field} type="password" className={inputClass} {...passwordForm.register(field)} />
            {passwordForm.formState.errors[field] && (
              <p className="text-xs text-destructive">{passwordForm.formState.errors[field]?.message}</p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={pwLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pwLoading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
