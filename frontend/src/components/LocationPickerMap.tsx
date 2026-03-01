import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet';
import pointerPin from '../assets/pointer-pin.svg';
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'

// Override default Leaflet marker icon
const pointerIcon = new L.Icon({
  iconUrl: pointerPin,
  iconSize: [32, 32], // Adjust size as needed
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: 'custom-leaflet-marker',
});
L.Marker.prototype.options.icon = pointerIcon;

interface Props {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}

function ClickableMap({ position, setPosition }: Props) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  return position === null ? null : (
    <Marker position={position} />
  )
}

function MapPanUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (position) {
      // Smoothly fly to the new GPS coordinates
      map.flyTo(position, 16, { duration: 1.5 })
    }
  }, [position, map])

  return null
}

export default function LocationPickerMap({ position, setPosition }: Props) {
  const centerPosition: [number, number] = [39.6837, -75.7497]

  return (
    <MapContainer 
      center={centerPosition} 
      zoom={13} 
      scrollWheelZoom={true} 
      className="h-full w-full z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickableMap position={position} setPosition={setPosition} />
      <MapPanUpdater position={position} /> 
    </MapContainer>
  )
}