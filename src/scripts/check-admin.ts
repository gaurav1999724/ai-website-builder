import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdmin() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    console.log('All users in database:')
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.role}, Active: ${user.isActive}`)
    })

    const adminUsers = users.filter(user => user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
    console.log(`\nAdmin users found: ${adminUsers.length}`)
    
    if (adminUsers.length === 0) {
      console.log('No admin users found! Creating one...')
      const { hash } = await import('bcryptjs')
      const hashedPassword = await hash('admin123', 12)
      
      const adminUser = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      
      console.log(`Created admin user: ${adminUser.email}`)
    }
    
  } catch (error) {
    console.error('Error checking admin users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmin()
