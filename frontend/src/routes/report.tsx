import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/report')({
  component: ReportPage,
})

function ReportPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generate City Report</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Select a verified pothole location to generate an AI-summarized civic maintenance request.</p>
      </div>

      {/* Placeholder for the Gemini PDF generation form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">Report configuration form will go here</p>
      </div>
    </main>
  )
}