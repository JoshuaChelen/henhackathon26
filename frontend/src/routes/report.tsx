import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/report')({
  component: ReportPage,
})

interface Pothole {
  id: string;
  image_url: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
  resolved_count: number;
}

function ReportPage() {
  const location = useLocation()
  const pothole = (location.state as { pothole?: Pothole })?.pothole
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <main className="flex-1 flex flex-col mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Placeholder for the Gemini PDF generation form */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Report configuration form will go here</p>
        </div>
      </main>
    </div>
  )
}