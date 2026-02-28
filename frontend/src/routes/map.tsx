import { createFileRoute } from '@tanstack/react-router'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export const Route = createFileRoute('/map')({
  component: MapPage,
})

function MapPage() {
  // Coordinates in Newark, Delaware
  const centerPosition: [number, number] = [39.6837, -75.7497]

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Pothole Map</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Viewing crowdsourced road hazards in the Newark area.
        </p>
      </div>

      {/* Map Container Wrapper */}
      <div className="h-[600px] w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800">
        <MapContainer 
          center={centerPosition} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="h-full w-full z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Example Dummy Marker */}
          <Marker position={centerPosition}>
            <Popup>
              <div className="min-w-[150px]">
                <p className="m-0 font-bold text-red-600">High Severity</p>
                <p className="m-0 text-sm text-gray-600">Detected: Just now</p>
                <img 
                  src="https://via.placeholder.com/150" 
                  alt="Pothole crop" 
                  className="mt-2 w-full rounded-md object-cover"
                />
              </div>
            </Popup>
          </Marker>

        </MapContainer>
      </div>
    </main>
  )
}