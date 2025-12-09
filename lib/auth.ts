import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const adminUsername = process.env.ADMIN_USERNAME || 'admin'
        const adminPassword = process.env.ADMIN_PASSWORD

        if (!adminPassword) {
          console.error('ADMIN_PASSWORD environment variable is not set')
          return null
        }

        if (credentials.username !== adminUsername) {
          return null
        }

        // Check if password is hashed (starts with $2a$ or $2b$)
        const isHashed = adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')

        let isValid = false
        if (isHashed) {
          isValid = await bcrypt.compare(credentials.password, adminPassword)
        } else {
          // Plain text comparison (not recommended for production)
          isValid = credentials.password === adminPassword
        }

        if (!isValid) {
          return null
        }

        return {
          id: '1',
          name: adminUsername,
          email: `${adminUsername}@localhost`,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    },
  },
}
