/** Fare data model. Money in the JSON files is in decimal pesos; the engine
 *  converts to integer centavos before doing any arithmetic. */

export type Lang = 'en' | 'fil'
export type Localized = Record<Lang, string>

export type Category =
  | 'jeepney'
  | 'uv'
  | 'bus-city'
  | 'bus-provincial'
  | 'busway'
  | 'taxi'
  | 'tnvs'
  | 'rail'

export type Method = 'ADD_ON' | 'PER_KM' | 'METERED' | 'MATRIX'

export interface ModeBase {
  id: string
  name: Localized
  category: Category
  method: Method
  effective: string
  source: string
  sourceDoc?: string
  notes?: Localized
  status?: 'active' | 'pending_data'
}

export interface AddOnRate {
  baseKm: number
  baseFare: number
  perKm: number
}
export interface PerKmRate {
  perKm: number
}
export interface TableRange {
  minKm: number
  maxKm: number
  stepKm: number
}

export interface AddOnMode extends ModeBase {
  method: 'ADD_ON'
  rounding: number
  regular: AddOnRate
  discounted: AddOnRate
  previous?: { regular: AddOnRate; discounted: AddOnRate }
  tableRange?: TableRange
}

export interface PerKmMode extends ModeBase {
  method: 'PER_KM'
  rounding: number
  regular: PerKmRate
  discounted: PerKmRate
  previous?: { regular: PerKmRate; discounted: PerKmRate }
  tableRange?: TableRange
}

export interface TimeDistanceTaxiMode extends ModeBase {
  method: 'METERED'
  variant: 'time-distance'
  discountPct: number
  flagDown: number
  perKm: number
  perMin: number
}

export interface SteppedTaxiMode extends ModeBase {
  method: 'METERED'
  variant: 'stepped'
  discountPct: number
  flagDown: number
  flagDownCoversMeters: number
  distanceStep: { meters: number; fare: number }
  timeStep: { minutes: number; fare: number }
}

export interface TnvsVehicle {
  id: string
  name: Localized
  flagDown: number
  perKm: number
  perMin: number
}

export interface TnvsMode extends ModeBase {
  method: 'METERED'
  variant: 'tnvs'
  discountPct: number
  pickupPerKm: number
  pickupRounding: 'floor'
  vehicles: TnvsVehicle[]
}

export type MeteredMode = TimeDistanceTaxiMode | SteppedTaxiMode | TnvsMode

export interface StationInfo {
  /** Name on the station map, when it differs from the fare matrix name. */
  mapName: string
  lat: number
  lng: number
  /** Short note from the map, e.g. "Connects to MRT-3 Ayala Station." */
  note: string
}

export interface MatrixDirection {
  stations: string[]
  /** Parallel to `stations`; null where no map data exists. */
  stationInfo?: (StationInfo | null)[]
  /** Fares before the latest change, same shape as `regular` (optional). */
  previous?: { regular: (number | null)[][] }
  /** fares[i][j] in pesos for i < j; null when j <= i */
  regular: (number | null)[][]
  discounted: (number | null)[][]
}

export interface MatrixMode extends ModeBase {
  method: 'MATRIX'
  /**
   * 'direction' (default): keys of `directions` are travel directions with
   * their own station order; destination must come after the origin.
   * 'ticket': keys are ticket types (e.g. single-journey, stored-value) over
   * one symmetric station list; any origin/destination order is valid.
   */
  kind?: 'direction' | 'ticket'
  discountPct?: number
  sourceUrl?: string
  minFare: { regular: number; discounted: number }
  basis?: Localized
  stationSource?: string
  directions: Record<string, MatrixDirection>
}

export type DistanceMode = AddOnMode | PerKmMode
export type Mode = AddOnMode | PerKmMode | MeteredMode | MatrixMode

export interface Manifest {
  version: string
  effective: string
  source: string
  sourceUrl?: string
  modes: string[]
}

/** Integer centavos. */
export type Centavos = number

export interface DistanceFare {
  km: number
  /** Whole km actually charged (after ceil). */
  chargedKm: number
  regular: Centavos
  discounted: Centavos
  previous?: { regular: Centavos; discounted: Centavos }
  beyondTable: boolean
}

export interface MeteredBreakdown {
  flagDown: Centavos
  distance: Centavos
  time: Centavos
  pickup: Centavos
  total: Centavos
  discounted: Centavos
}

export interface MatrixFare {
  from: string
  to: string
  regular: Centavos
  discounted: Centavos
  previous?: { regular: Centavos }
}
