export interface ResolvedDestination {
  lat: number;
  lng: number;
  address: string;
  confidence: number;
}

export interface DispatchDecision {
  selectedDriverId: string;
  reasoning: string;
}
