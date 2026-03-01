import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '../supabaseClient'
import 'leaflet/dist/leaflet.css'

export interface Pothole {
  id: string;
  image_url: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
  resolved_count: number;
}

interface ExportResponse {
  ok: boolean;
  smalltalk?: {
    ok?: boolean;
    executed?: boolean;
    analysis?: unknown;
    stdout?: string;
    stderr?: string;
  };
}

const markResolved = async (id: string, currentValue: number) => {
  if (currentValue >= 3) {
    const { error } = await supabase
      .from('potholes_tagged')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    fetchPotholes();
    return;
  }
  const { error } = await supabase
    .from('potholes_tagged')  
    .update({ resolved_count: currentValue += 1 })
    .eq('id', id);
    console.log("Current value:", currentValue);
    if (error) throw new Error(error.message);
    fetchPotholes();
}

const fetchPotholes = async (): Promise<Pothole[]> => {
  const { data, error } = await supabase
    .from('potholes_map_view')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Pothole[];
}

function sendReport(pothole: Pothole, navigate: ReturnType<typeof useNavigate>) {
  navigate({ to: '/report', state: { pothole } as any })
}

const downloadPotholes = async (potholes: Pothole[]): Promise<ExportResponse> => {
  const response = await fetch('/api/potholes-export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ potholes }),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(
      result?.error
        ? `${result.error}${result?.details?.cause ? ` | cause: ${result.details.cause}` : ''}${result?.hint ? ` | hint: ${result.hint}` : ''}`
        : 'Failed to write potholes.json to project files',
    )
  }

  return response.json()
}

export default function PotholeMap() {
  const navigate = useNavigate()
  const centerPosition: [number, number] = [39.6837, -75.7497]
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set())
  const [analysis, setAnalysis] = useState<unknown | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<string | null>(null)
  const [syncingAnalysis, setSyncingAnalysis] = useState(false)
  const lastSyncedPayloadRef = useRef<string | null>(null)
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: potholes, isLoading, isError, error } = useQuery<Pothole[]>({
    queryKey: ['potholes'],
    queryFn: fetchPotholes,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!potholes?.length) return

    const payload = JSON.stringify(potholes)
    if (lastSyncedPayloadRef.current === payload) return

    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current)
    }

    syncDebounceRef.current = setTimeout(() => {
      setSyncingAnalysis(true)
      downloadPotholes(potholes)
        .then((result) => {
          lastSyncedPayloadRef.current = payload

          if (result?.smalltalk?.analysis !== undefined) {
            setAnalysis(result.smalltalk.analysis)
            setAnalysisUpdatedAt(new Date().toLocaleTimeString())
            setAnalysisError(null)
          } else {
            setAnalysisError('Backend responded without analysis data yet.')
          }
        })
        .catch((error) => {
          console.error('Failed to export potholes JSON:', error)
          setAnalysisError(error instanceof Error ? error.message : 'Failed to export potholes JSON')
        })
        .finally(() => {
          setSyncingAnalysis(false)
        })
    }, 1500)

    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current)
      }
    }
  }, [potholes]);

  if (isLoading) return <p className="p-4 font-semibold text-blue-600">Fetching live map data...</p>
  if (isError) return <p className="p-4 font-semibold text-red-600">Failed to load: {error.message}</p>

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={centerPosition}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {potholes?.map((pothole) => (
          <Marker key={pothole.id} position={[pothole.latitude, pothole.longitude]}>
            <Popup>
              <div className="min-w-[150px]">
                <p className={`m-0 font-bold uppercase ${
                  pothole.severity === 'high' ? 'text-red-600' :
                  pothole.severity === 'medium' ? 'text-orange-500' : 'text-green-600'
                }`}>
                  {pothole.severity} Severity
                </p>
                <p className="m-0 text-xs text-gray-500">
                  Reported: {new Date(pothole.date).toLocaleDateString()}
                </p>
                <img
                  src={pothole.image_url}
                  alt={`Pothole marked as ${pothole.severity}`}
                  className="mt-2 w-full rounded-md object-cover"
                />
                <button
                  className={`mt-2 w-full text-white py-1 rounded-md text-sm transition-colors ${
                    clickedIds.has(pothole.id)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  onClick={() => {
                    markResolved(pothole.id, pothole.resolved_count);
                    setClickedIds(prev => new Set(prev).add(pothole.id));
                  }}
                  disabled={clickedIds.has(pothole.id)}
                >
                  {clickedIds.has(pothole.id) ? 'Marked as resolved' : 'Mark as resolved'}
                </button>
                <button
                  className="mt-2 w-full text-white py-1 rounded-md text-sm bg-red-500 hover:bg-red-600 transition-colors"
                  onClick={() => sendReport(pothole, navigate)}>
                  Generate City Report
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] w-[360px] max-w-[calc(100%-1.5rem)] rounded-lg border border-gray-200 bg-white/95 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/95">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Processed Analysis</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {syncingAnalysis ? 'Syncing…' : analysisUpdatedAt ? `Updated ${analysisUpdatedAt}` : 'Waiting for data'}
          </p>
        </div>

        {analysisError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{analysisError}</p>
        ) : analysis ? (
          <pre className="max-h-48 overflow-auto rounded bg-gray-50 p-2 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Analysis will appear here after backend processing.
          </p>
        )}
      </div>
    </div>
  )
}