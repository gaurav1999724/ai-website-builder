#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    console.log('Creating test user...')
    
    const email = 'test@example.com'
    const password = 'password123'
    const name = 'Test User'
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email)
      return existingUser
    }
    
    // Hash password
    const hashedPassword = await hash(password, 12)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })
    
    console.log('Test user created successfully:')
    console.log('- ID:', user.id)
    console.log('- Email:', user.email)
    console.log('- Name:', user.name)
    console.log('- Password: password123')
    
    return user
  } catch (error) {
    console.error('Error creating test user:', error)
    throw error
  }
}

async function listUsers() {
  try {
    console.log('\nListing all users...')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        password: true
      }
    })
    
    if (users.length === 0) {
      console.log('No users found in database.')
    } else {
      console.log(`Found ${users.length} user(s):`)
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.name}) - ID: ${user.id}`)
        console.log(`   Created: ${user.createdAt}`)
        console.log(`   Has Password: ${!!user.password}`)
      })
    }
    
    return users
  } catch (error) {
    console.error('Error listing users:', error)
    throw error
  }
}

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function main() {
  const command = process.argv[2]
  
  try {
    switch (command) {
      case 'create':
        await createTestUser()
        break
      case 'list':
        await listUsers()
        break
      case 'test':
        await testDatabaseConnection()
        break
      default:
        console.log('Auth Test Script')
        console.log('')
        console.log('Usage:')
        console.log('  node scripts/test-auth.js create  - Create a test user')
        console.log('  node scripts/test-auth.js list    - List all users')
        console.log('  node scripts/test-auth.js test    - Test database connection')
        console.log('')
        console.log('Test user credentials:')
        console.log('  Email: test@example.com')
        console.log('  Password: password123')
        break
    }
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
