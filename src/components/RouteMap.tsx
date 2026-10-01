import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { DEFAULT_CENTER, type LatLng, type RouteResult } from '../lib/routing'

export interface RouteMapProps {
  from: LatLng | null
  to: LatLng | null
  route: RouteResult | null
  onPick: (p: LatLng) => void
}

/** Leaflet map with OpenStreetMap tiles. Loaded lazily (see RoutePicker). */
export default function RouteMap({ from, to, route, onPick }: RouteMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(
      [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      12,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const pin = (p: LatLng, color: string, label: string) =>
      L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10] })
        .addTo(g)
    if (from) pin(from, '#0b3d91', 'A')
    if (to) pin(to, '#ffc72c', 'B')
    if (route) {
      const line = L.polyline(route.geometry, { color: '#0b3d91', weight: 5, opacity: 0.85 }).addTo(g)
      m.fitBounds(line.getBounds(), { padding: [24, 24] })
    } else if (from && !to) {
      m.panTo([from.lat, from.lng])
    }
  }, [from, to, route])

  return <div ref={el} className="route-map" data-testid="route-map" />
}
