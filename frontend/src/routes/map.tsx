import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState } from 'react'

export const Route = createFileRoute('/map')({
  component: MapPage,
})

const ClientMap = lazy(() => import('../components/PotholeMap'))

function MapPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Pothole Map</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Viewing crowdsourced potholes.
        </p>
      </div>

      <div className="h-[600px] w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        {isClient ? (
          <Suspense fallback={<div className="flex h-full items-center justify-center font-medium">Loading map engine...</div>}>
            <ClientMap />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center font-medium">
            Initializing interface...
          </div>
        )}
      </div>
    </main>
  )
}