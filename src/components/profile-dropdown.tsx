'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Edit,
  Eye,
  Mail,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface ProfileDropdownProps {
  className?: string
}

export function ProfileDropdown({ className }: ProfileDropdownProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(session?.user?.name || '')
  const [editEmail, setEditEmail] = useState(session?.user?.email || '')

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/auth/signin' })
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const handleEditProfile = () => {
    setIsEditing(true)
    setEditName(session?.user?.name || '')
    setEditEmail(session?.user?.email || '')
  }

  const handleSaveProfile = async () => {
    try {
      // Here you would typically make an API call to update the profile
      // For now, we'll just show a success message
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditName(session?.user?.name || '')
    setEditEmail(session?.user?.email || '')
  }

  const handleViewProfile = () => {
    // Navigate to profile details page
    router.push('/profile')
  }

  if (!session?.user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`flex items-center space-x-2 hover:bg-gray-800 ${className}`}
        >
          <div className="flex items-center space-x-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-8 h-8 rounded-full border-2 border-gray-600"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="text-sm font-medium text-white hidden sm:block">
              {session.user.name || 'User'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-gray-800 border-gray-700 text-white"
      >
        <DropdownMenuLabel className="text-gray-300">
          <div className="flex items-center space-x-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <p className="font-medium">{session.user.name || 'User'}</p>
              <p className="text-xs text-gray-400">{session.user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuItem 
          onClick={handleViewProfile}
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleEditProfile}
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => router.push('/settings')}
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-400 hover:bg-red-900/20 hover:text-red-300 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Profile Edit Modal Component
export function ProfileEditModal({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; email: string }) => void
}) {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user?.name || '')
  const [email, setEmail] = useState(session?.user?.email || '')

  const handleSave = () => {
    onSave({ name, email })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Edit Profile</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
