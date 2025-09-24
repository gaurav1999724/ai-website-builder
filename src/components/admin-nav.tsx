'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings, Shield } from 'lucide-react'

export function AdminNav() {
  const { data: session } = useSession()
  const router = useRouter()

  // Only show for admin users
  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        onClick={() => router.push('/admin')}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        size="sm"
      >
        <Shield className="h-4 w-4 mr-2" />
        Admin Panel
      </Button>
    </div>
  )
}
