'use client'

import { useSession } from 'next-auth/react'

export function DebugSession() {
  const { data: session, status } = useSession()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    // <div className="fixed bottom-4 left-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-white max-w-sm">
    //   <h3 className="font-bold mb-2">Debug Session Info:</h3>
    //   <div className="space-y-1">
    //     <div>Status: {status}</div>
    //     <div>User ID: {session?.user?.id || 'N/A'}</div>
    //     <div>Email: {session?.user?.email || 'N/A'}</div>
    //     <div>Name: {session?.user?.name || 'N/A'}</div>
    //     <div>Role: {session?.user?.role || 'N/A'}</div>
    //     <div>Active: {session?.user?.isActive ? 'Yes' : 'No'}</div>
    //   </div>
    // </div>
    ''
  )
}
