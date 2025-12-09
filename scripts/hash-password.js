#!/usr/bin/env node

/**
 * Password Hashing Utility
 *
 * This script generates a bcrypt hash of a password.
 * Usage: node scripts/hash-password.js <your-password>
 */

const bcrypt = require('bcryptjs')

const password = process.argv[2]

if (!password) {
  console.error('Error: Please provide a password to hash')
  console.log('Usage: node scripts/hash-password.js <your-password>')
  process.exit(1)
}

const saltRounds = 10
const hash = bcrypt.hashSync(password, saltRounds)

console.log('\n===========================================')
console.log('Password Hash Generated Successfully!')
console.log('===========================================')
console.log('\nYour hashed password:')
console.log(hash)
console.log('\nAdd this to your .env file:')
console.log(`ADMIN_PASSWORD=${hash}`)
console.log('\n===========================================\n')
