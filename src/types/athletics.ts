export type TestType = 
  | 'cmj' 
  | 'cmj_arms' 
  | 'sj' 
  | 'dj' 
  | 'approach' 
  | 'rsi' 
  | 'fvp' 
  | 'standard' 
  | 'power_clean' 
  | 'full_squat' 
  | 'bench_press' 
  | string;

export interface Player {
  id: string;
  full_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  weight_kg: number;
  leg_length_m?: number | null;
  /** Measured push-off distance (m); null → estimated from leg length */
  hpo_m?: number | null;
  gender?: 'male' | 'female' | string;
  height_cm?: number | null;
  standing_reach_cm?: number | null;
  coach_id?: string | null;
  created_at?: string;
  is_favorite?: boolean | null;
  // Extended UI helper properties
  bestCmj?: number;
  bestRsi?: number;
  bestSquat?: number;
  bestBench?: number;
  bestClean?: number;
}

export interface JumpMeasurement {
  id: string;
  player_id: string;
  test_type: TestType;
  jump_height_cm: number;
  flight_time_sec: number;
  contact_time_sec?: number | null;
  rsi_score?: number | null;
  box_height_cm?: number | null;
  takeoff_velocity_ms?: number | null;
  mean_power_watts?: number | null;
  peak_power_watts?: number | null;
  clean_weight_kg?: number | null;
  clean_bw_ratio?: number | null;
  notes?: string | null;
  week_number?: number | null;
  reps_count?: number | null;
  created_at: string;
}

export interface Coach {
  id: string;
  full_name: string;
  created_at?: string;
}

export interface InviteCode {
  code: string;
  is_used: boolean;
  created_at: string;
}

// Biomechanics & Telemetry Interfaces
export type GCTCategory = 'elite_fast' | 'moderate' | 'slow';

export interface GCTAnalysis {
  category: GCTCategory;
  labelAr: string;
  labelEn: string;
  zoneColor: string; // CSS color or hex
  descriptionAr: string;
  descriptionEn: string;
}

export interface JumpMechanicsStats {
  heightCm: string;
  heightInches: string;
  flightTime: string;
  takeoffVelocity: string;
  meanPower: string;
  harmanPeakPower: string;
  harmanMeanPower: string;
  sayersPeakPower: string;
  pushAcceleration: string;
  pushDuration: string;
  contactTime: string;
  rsi: string;
  meanForce: string;
  /** true when hPO fell back to leg length × 0.45 */
  hpoEstimated: boolean;
  gctAnalysis?: GCTAnalysis | null;
}

// Force-Velocity Profiling (FVP)
export interface FVPPoint {
  loadKg: number;
  jumpHeightCm: number;
  forceN?: number;
  velocityMs?: number;
  powerW?: number;
}

export interface FVPProfile {
  F0: number; // Theoretical Max Force (N or N/kg)
  V0: number; // Theoretical Max Velocity (m/s)
  Pmax: number; // Theoretical Max Power (W or W/kg)
  Sfv: number; // Current Slope (N·s/m/kg)
  SfvOpt: number; // Optimal Slope (N·s/m/kg)
  FVImbPercent: number; // Profile Imbalance % (100% = optimal)
  profileType: 'force_deficit' | 'velocity_deficit' | 'well_balanced';
  prescriptionAr: string;
  prescriptionEn: string;
  rSquared: number;
}

// CNS Fatigue & Readiness
export type CNSStatus = 'optimal' | 'moderate_fatigue' | 'high_cns_fatigue';

export interface CNSReadiness {
  baselineCmj: number;
  todayCmj: number;
  percentDrop: number;
  status: CNSStatus;
  statusLabelAr: string;
  statusLabelEn: string;
  recommendationAr: string;
  recommendationEn: string;
  color: string;
}

// Elasticity vs Strength Quadrant (EUR & DJ/CMJ)
export type ElasticityQuadrantType = 
  | 'elastic_dominant' 
  | 'strength_dominant' 
  | 'well_balanced_elite' 
  | 'general_deficit';

export interface ElasticityQuadrantData {
  eur: number; // CMJ / SJ
  reactiveIndex: number; // DJ / CMJ
  cmjHeight: number;
  sjHeight: number;
  djHeight: number;
  quadrant: ElasticityQuadrantType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  color: string;
}

// Application Navigation
export type ActiveTabType = 
  | 'team' 
  | 'calculator' 
  | 'manual' 
  | 'rsi' 
  | 'fvp' 
  | 'profile' 
  | 'leaderboard';
