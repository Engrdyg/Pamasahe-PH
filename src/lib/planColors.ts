import type { LineKind } from './planner'

/** Colour per kind of ride, shared by the planner list and map. */
export const KIND_COLOR: Record<LineKind, string> = { jeep: '#0b3d91', uv: '#7c3aed', rail: '#16a34a', busway: '#dc2626' }
