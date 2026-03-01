import { createFileRoute } from '@tanstack/react-router'
import FileUpload from '#/components/FileUpload'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

function UploadPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <main className="flex-1 flex flex-col mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Dashcam Footage</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Upload video files for the computer vision model to parse and detect road anomalies.</p>
        </div>
        <FileUpload></FileUpload>
      </main>
    </div>
  )
}