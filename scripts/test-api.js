#!/usr/bin/env node

const fetch = require('node-fetch')

async function testApiWithAuth() {
  try {
    console.log('Testing API with authentication...')
    
    // First, let's try to sign in to get a session
    const signinResponse = await fetch('http://localhost:3000/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'test@example.com',
        password: 'password123',
        callbackUrl: 'http://localhost:3000/dashboard'
      }),
      redirect: 'manual'
    })
    
    console.log('Signin response status:', signinResponse.status)
    console.log('Signin response headers:', Object.fromEntries(signinResponse.headers.entries()))
    
    // Extract cookies from the response
    const cookies = signinResponse.headers.get('set-cookie')
    console.log('Cookies received:', cookies)
    
    if (cookies) {
      // Now test the API with the session cookie
      const apiResponse = await fetch('http://localhost:3000/api/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          prompt: 'Create a simple portfolio website',
          provider: 'cerebras'
        })
      })
      
      console.log('API response status:', apiResponse.status)
      console.log('API response headers:', Object.fromEntries(apiResponse.headers.entries()))
      
      const responseText = await apiResponse.text()
      console.log('API response body:', responseText)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

async function testApiDirectly() {
  try {
    console.log('\nTesting API directly (should get 401)...')
    
    const response = await fetch('http://localhost:3000/api/projects/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Create a simple portfolio website',
        provider: 'cerebras'
      })
    })
    
    console.log('Direct API response status:', response.status)
    console.log('Direct API response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Direct API response body:', responseText)
    
  } catch (error) {
    console.error('Direct test failed:', error)
  }
}

async function main() {
  await testApiDirectly()
  await testApiWithAuth()
}

main()
