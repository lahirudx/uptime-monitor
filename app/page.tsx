import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Uptime Monitor
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 px-4">
            Open-source uptime monitoring and status pages
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link
              href="/dashboard"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/api/monitors"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              API Documentation
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">📊</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 dark:text-white">Real-time Monitoring</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Monitor HTTP/HTTPS endpoints with customizable check intervals
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">🔔</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 dark:text-white">Instant Alerts</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Get notified via email or webhooks when your services go down
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg sm:col-span-2 md:col-span-1">
            <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">📈</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 dark:text-white">Analytics & History</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Track uptime percentages and response times over time
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
