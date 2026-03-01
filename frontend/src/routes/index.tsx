
import { createFileRoute, Link } from '@tanstack/react-router'
import '../westernSunset.css';
import AnimatedBackground from '../components/AnimatedBackground';

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ fontFamily: 'serif' }}>
      {/* Content */}
      <div className="relative z-10 max-w-3xl p-8 rounded-xl bg-white/80 dark:bg-gray-900/80 shadow-xl border border-orange-200 dark:border-orange-700" style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300" style={{ letterSpacing: '0.2em' }}>
          Public Infrastructure Hub
        </h2>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-orange-900 dark:text-orange-100 sm:text-5xl md:text-6xl" style={{ fontFamily: 'serif', textShadow: '2px 2px 0 #f2a85b, 4px 4px 0 #d7813b' }}>
          Welcome to Pothole Tracker
        </h1>
        <p className="mt-4 text-xl text-orange-800 dark:text-orange-200" style={{ fontFamily: 'serif' }}>
          Mapping user-reported pothole data to generate actionable city reports.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/map"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-700 px-6 py-3 text-base font-medium text-white hover:bg-orange-800 md:text-lg shadow-md font-sans"
          >
            Open Pothole Map
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center rounded-md border border-orange-400 bg-white px-6 py-3 text-base font-medium text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200 dark:hover:bg-orange-900 md:text-lg shadow-md font-sans"
          >
            Upload Video
          </Link>
          <Link
            to="/report"
            className="inline-flex items-center justify-center rounded-md border border-orange-400 bg-white px-6 py-3 text-base font-medium text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200 dark:hover:bg-orange-900 md:text-lg shadow-md font-sans"
          >
            Generate City Report
          </Link>
        </div>
      </div>
    </main>
  )
}