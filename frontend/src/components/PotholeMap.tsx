import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import 'leaflet/dist/leaflet.css'

export interface Pothole {
  id: string;
  image_url: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
}

const fetchPotholes = async (): Promise<Pothole[]> => {
  const { data, error } = await supabase
    .from('potholes_map_view')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Pothole[];
}

export default function PotholeMap() {
  const centerPosition: [number, number] = [39.6837, -75.7497]

  const { data: potholes, isLoading, isError, error } = useQuery({
    queryKey: ['potholes'],
    queryFn: fetchPotholes,
    refetchInterval: 10000, 
  });

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
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}