import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

function UploadPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Dashcam Footage</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Upload video files for the computer vision model to parse and detect road anomalies.</p>
      </div>
      
      {/* Placeholder for the drag-and-drop form */}
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">Drag and drop zone will go here</p>
      </div>
    </main>
  )
}