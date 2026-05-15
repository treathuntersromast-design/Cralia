import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OtpForm from './OtpForm'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

export default async function AdminOtpPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin/otp')

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/dashboard')
  }

  return <OtpForm email={user.email ?? ''} />
}
