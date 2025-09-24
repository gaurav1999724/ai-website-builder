import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = process.argv[2] || 'admin@example.com'
    const password = process.argv[3] || 'admin123'
    const name = process.argv[4] || 'Admin User'

    console.log(`Creating admin user with email: ${email}`)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { 
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log(`Updated existing user to admin: ${updatedUser.email}`)
    } else {
      // Create new admin user
      const hashedPassword = await hash(password, 12)
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      
      console.log(`Created admin user: ${user.email}`)
    }
    
    console.log('Admin user created/updated successfully!')
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
