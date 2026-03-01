import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, lazy, Suspense, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export const Route = createFileRoute('/review/$potholeId')({
  component: ReviewPage,
})

const LocationPickerMap = lazy(() => import('../components/LocationPickerMap'))

function ReviewPage() {
  const { potholeId } = Route.useParams()
  const navigate = useNavigate()

  const [position, setPosition] = useState<[number, number] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Poll the pothole_image_data table
  const { data: videoDoc, isLoading, isError } = useQuery({
    queryKey: ['videoAnalysis', potholeId],
    queryFn: async () => {
      // Fetch from the table that the FileUpload just inserted into
      const { data, error } = await supabase
        .from('pothole_image_data')
        .select('*')
        .eq('id', potholeId)
        .single()
      
      if (error) throw error
      return data
    },
    // The magic trick: Poll every 3 seconds IF the status is not 'completed' yet
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      return currentStatus === 'completed' ? false : 3000;
    },
  })

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setIsLocating(false)
      },
      (err) => {
        console.error("GPS Error:", err)
        alert("Unable to retrieve your location. Please ensure location permissions are granted.")
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!position) {
      alert("Please click on the map to drop a pin for the pothole location.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.rpc('confirm_pothole_location', {
        p_id: parseInt(potholeId, 10),
        p_lat: position[0],
        p_lng: position[1]
      })

      if (error) throw error

      navigate({ to: '/map' })
    } catch (err) {
      console.error('Failed to update location:', err)
      alert('Failed to confirm location. Check the console for details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-12 text-center font-semibold text-blue-600">Connecting to telemetry pipeline...</div>
  if (isError) return <div className="p-12 text-center font-semibold text-red-600">Error loading data.</div>
  if (!videoDoc) return <div className="p-12 text-center font-semibold text-gray-600">Record not found.</div>

  // Calculate a fake "Severity" based on the AI's confidence score if your table doesn't have it yet
  const confidenceScore = videoDoc.confidence || 0;
  const severity = confidenceScore > 0.75 ? 'high' : confidenceScore > 0.5 ? 'medium' : 'low';

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      
      {/* 1. Header Section */}
      <div className="mb-8 border-b border-gray-200 pb-4 dark:border-gray-800 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis Pipeline Tracker</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 font-mono text-sm">
            Tracking Job: {videoDoc.source_file || potholeId}
          </p>
        </div>
        <div className={`px-4 py-2 rounded font-bold uppercase text-xs ${
            videoDoc.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 animate-pulse' : 
            videoDoc.status === 'processing' ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse' : 
            'bg-green-100 text-green-800 border border-green-300'
          }`}>
            Status: {videoDoc.status}
        </div>
      </div>

      {/* 2. Loading States (Hidden when completed) */}
      {videoDoc.status === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
          <p className="text-xl text-gray-600 font-semibold mb-2">Video is in queue.</p>
          <p className="text-sm text-gray-400">Waiting for available compute instances...</p>
        </div>
      )}

      {videoDoc.status === 'processing' && (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 font-semibold mb-2">Model is extracting frames...</p>
          <p className="text-sm text-gray-400">Detecting potholes and road hazards...</p>
        </div>
      )}

      {/* 3. Completed State (Shows your original map verification UI) */}
      {videoDoc.status === 'completed' && (
        <div className="grid gap-8 md:grid-cols-2 animate-in fade-in duration-700">
          
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 h-fit">
              <div className="flex justify-between items-start mb-4">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  severity === 'high' ? 'bg-red-100 text-red-800' :
                  severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {severity} Severity
                </span>
                <span className="text-xs font-mono text-gray-500">
                  Confidence: {(confidenceScore * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900 flex justify-center border border-gray-200">
                {videoDoc.image_url ? (
                  <img 
                    src={videoDoc.image_url} 
                    alt="Detected Pothole" 
                    className="max-h-96 w-auto object-contain" 
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center text-gray-400">Extracting image frame...</div>
                )}
              </div>
            </div>
            
            <div className="bg-green-50 text-green-800 p-4 rounded border border-green-200 text-sm">
              <strong>Analysis complete!</strong> Please drop a pin on the map to confirm the exact location of this anomaly before publishing it to the city grid.
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className={`flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition duration-200 ${
                isLocating 
                  ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-inner dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300 cursor-wait' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isLocating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Acquiring Location...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                  </svg>
                  Use My Current Location
                </>
              )}
            </button>
            
            <div className="h-[400px] w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
              {isClient ? (
                <Suspense fallback={<div className="flex h-full items-center justify-center">Loading map...</div>}>
                  <LocationPickerMap position={position} setPosition={setPosition} />
                </Suspense>
              ) : (
                <div className="flex h-full items-center justify-center">Initializing map...</div>
              )}
            </div>
            
            {position ? (
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center">
                Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
              </p>
            ) : (
              <p className="text-sm text-gray-400 text-center italic">
                Awaiting map interaction...
              </p>
            )}

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !position}
              className="w-full rounded-md bg-blue-600 px-4 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400 disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Confirm Location & Publish'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}