import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
      <div className="max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Public Infrastructure Hub
        </h2>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
          Welcome to Pothole Tracker
        </h1>
        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
          Mapping user-reported pothole data to generate actionable city reports.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/map"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 md:text-lg"
          >
            Open Pothole Map
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 md:text-lg"
          >
            Upload Video
          </Link>
          <Link
            to="/report"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 md:text-lg"
          >
            Generate City Report
          </Link>
        </div>
      </div>
    </main>
  )
}