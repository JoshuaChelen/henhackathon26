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
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generate City Report</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Select a verified pothole location to generate an AI-summarized civic maintenance request.</p>
      </div>

      {pothole ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Pothole</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p><strong>ID:</strong> {pothole.id}</p>
            <p><strong>Severity:</strong> <span className={`font-semibold ${
              pothole.severity === 'high' ? 'text-red-600' : 
              pothole.severity === 'medium' ? 'text-orange-500' : 'text-green-600'
            }`}>{pothole.severity.toUpperCase()}</span></p>
            <p><strong>Date Reported:</strong> {new Date(pothole.date).toLocaleDateString()}</p>
            <p><strong>Location:</strong> {pothole.latitude.toFixed(4)}, {pothole.longitude.toFixed(4)}</p>
            <p><strong>Resolved Count:</strong> {pothole.resolved_count}</p>
          </div>
          {pothole.image_url && (
            <div className="mt-4">
              <img src={pothole.image_url} alt="Pothole" className="max-w-md rounded-md" />
            </div>
          )}
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Report configuration form will go here</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">No pothole selected. Please select a pothole from the map.</p>
        </div>
      )}
    </main>
  )
}