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

const downloadPotholes = async (potholes: Pothole[]) => {
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
}

export default function PotholeMap() {
  const navigate = useNavigate()
  const centerPosition: [number, number] = [39.6837, -75.7497]
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set())
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
      downloadPotholes(potholes)
        .then(() => {
          lastSyncedPayloadRef.current = payload
        })
        .catch((error) => {
          console.error('Failed to export potholes JSON:', error)
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
    // TODO Get user's location to use as center position!
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
  )
}