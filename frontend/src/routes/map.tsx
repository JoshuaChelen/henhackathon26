'use client'

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Road Hazard Map</h1>
        <p className="mt-2 text-black dark:text-black">
          Viewing crowdsourced road hazards.
        </p>
      </div>

      <div className="w-full">
        {isClient ? (
          <Suspense fallback={<div className="flex h-[600px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 font-medium shadow-sm dark:border-gray-800 dark:bg-gray-900">Loading map engine...</div>}>
            <ClientMap />
          </Suspense>
        ) : (
          <div className="flex h-[600px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 font-medium shadow-sm dark:border-gray-800 dark:bg-gray-900">
            Initializing interface...
          </div>
        )}
      </div>
    </main>
  )
}