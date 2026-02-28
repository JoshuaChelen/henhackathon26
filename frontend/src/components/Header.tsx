import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Pothole Tracker
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link 
                to="/map" 
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" 
                activeProps={{ className: 'text-blue-600 dark:text-blue-400 font-semibold' }}
              >
                Map
              </Link>
              <Link 
                to="/upload" 
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" 
                activeProps={{ className: 'text-blue-600 dark:text-blue-400 font-semibold' }}
              >
                Upload Video
              </Link>
              <Link 
                to="/report" 
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" 
                activeProps={{ className: 'text-blue-600 dark:text-blue-400 font-semibold' }}
              >
                Generate Report
              </Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
          
        </nav>
      </div>
    </header>
  )
}