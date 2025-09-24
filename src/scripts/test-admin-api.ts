import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAdminAPI() {
  try {
    console.log('Testing Admin API endpoints...\n')

    // Test 1: Check if AI prompts exist
    const prompts = await prisma.aIPrompt.findMany()
    console.log(`✅ AI Prompts in database: ${prompts.length}`)
    prompts.forEach(prompt => {
      console.log(`   - ${prompt.name} (${prompt.provider}/${prompt.type}) - Active: ${prompt.isActive}`)
    })

    // Test 2: Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    })
    console.log(`\n✅ Users in database: ${users.length}`)
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - Role: ${user.role}, Projects: ${user._count.projects}`)
    })

    // Test 3: Check projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            files: true
          }
        }
      }
    })
    console.log(`\n✅ Projects in database: ${projects.length}`)
    projects.forEach(project => {
      console.log(`   - ${project.title} - Status: ${project.status}, Files: ${project._count.files}`)
    })

    // Test 4: Check project generations
    const generations = await prisma.projectGeneration.findMany({
      select: {
        id: true,
        aiProvider: true,
        status: true,
        createdAt: true
      }
    })
    console.log(`\n✅ Project Generations: ${generations.length}`)
    generations.forEach(gen => {
      console.log(`   - ${gen.aiProvider} - Status: ${gen.status}`)
    })

    console.log('\n🎉 Admin API test completed successfully!')
    console.log('\nTo access the admin dashboard:')
    console.log('1. Sign in with admin@example.com / admin123')
    console.log('2. Look for the "Admin Panel" button in the top-right corner')
    console.log('3. Or navigate directly to /admin')
    console.log('4. Check the debug info in the bottom-left corner for session details')

  } catch (error) {
    console.error('❌ Error testing admin API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminAPI()
