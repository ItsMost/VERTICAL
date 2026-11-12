/**
 * DEV ONLY (`npm run dev:mock`): in-memory stand-in for the Supabase client
 * with synthetic demo athletes, so the UI can be checked without the access
 * code or the real database. Never included in production builds.
 */
type Row = Record<string, any>;
const uid = () => Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 6);
const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString();

const coaches: Row[] = [{ id: 'c1', full_name: 'Coach A', created_at: day(200) }, { id: 'c2', full_name: 'Coach B', created_at: day(200) }];
const players: Row[] = [
  { id: 'p1', full_name: 'Demo Athlete 1', date_of_birth: '2005-03-01', weight_kg: 75, leg_length_m: 0.98, hpo_m: 0.42, gender: 'male', height_cm: 186, standing_reach_cm: 242, coach_id: 'c1', created_at: day(120) },
  { id: 'p2', full_name: 'Demo Athlete 2', date_of_birth: '2008-07-12', weight_kg: 61, leg_length_m: 0.9, hpo_m: null, gender: 'female', height_cm: 172, standing_reach_cm: null, coach_id: 'c1', created_at: day(110) },
  { id: 'p3', full_name: 'Demo Athlete 3', date_of_birth: '2004-11-20', weight_kg: 82, leg_length_m: 1.02, hpo_m: null, gender: 'male', height_cm: null, standing_reach_cm: null, coach_id: 'c2', created_at: day(100) },
  { id: 'p4', full_name: 'Demo Athlete 4', date_of_birth: '2009-01-05', weight_kg: 55, leg_length_m: 9, hpo_m: null, gender: 'female', height_cm: 165, standing_reach_cm: 212, coach_id: null, created_at: day(90) },
];
const m = (player_id: string, test_type: string, h: number, d: number, extra: Row = {}): Row => ({
  id: uid(), player_id, test_type, jump_height_cm: h, flight_time_sec: Math.sqrt((8 * h) / 100 / 9.81), created_at: day(d), ...extra,
});
const measurements: Row[] = [
  m('p1', 'cmj_arms', 52.1, 20), m('p1', 'cmj_arms', 53.4, 12), m('p1', 'cmj_arms', 54.0, 9), m('p1', 'cmj_arms', 52.8, 5), m('p1', 'cmj_arms', 49.6, 0),
  m('p1', 'cmj_no_arms', 45.2, 9), m('p1', 'sj_no_arms', 41.0, 9), m('p1', 'approach', 68.3, 6),
  m('p1', 'rsi', 38.2, 6, { contact_time_sec: 0.182, rsi_score: 2.1, box_height_cm: 40 }),
  m('p1', 'power_clean', 0, 15, { clean_weight_kg: 90, reps_count: 1 }),
  m('p2', 'cmj_arms', 38.5, 30), m('p2', 'cmj_no_arms', 33.1, 3), m('p2', 'sj_no_arms', 31.7, 3),
  m('p3', 'cmj_arms', 44.0, 2), m('p3', 'rsi', 30.1, 2, { contact_time_sec: 0.231, rsi_score: 1.3 }),
];
const db: Record<string, Row[]> = { lab_coaches: coaches, lab_players: players, lab_jump_measurements: measurements };

class Query implements PromiseLike<{ data: any; error: any }> {
  private filters: ((r: Row) => boolean)[] = [];
  private sort: [string, boolean] | null = null;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  constructor(private table: string) { db[table] ||= []; }
  select() { return this; }
  order(col: string, o: { ascending?: boolean } = {}) { this.sort = [col, o.ascending !== false]; return this; }
  eq(col: string, v: any) { this.filters.push(r => r[col] === v); return this; }
  insert(rows: Row[]) { this.op = 'insert'; this.payload = rows; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  then<A, B>(ok?: ((v: { data: any; error: any }) => A) | null, bad?: ((e: any) => B) | null) {
    return new Promise<{ data: any; error: any }>(res => setTimeout(() => res(this.run()), 150)).then(ok, bad);
  }
  private run() {
    const t = db[this.table];
    if (this.op === 'insert') {
      const rows = this.payload.map((r: Row) => ({ id: uid(), created_at: new Date().toISOString(), ...r }));
      t.push(...rows);
      return { data: rows, error: null };
    }
    const hit = t.filter(r => this.filters.every(f => f(r)));
    if (this.op === 'update') { hit.forEach(r => Object.assign(r, this.payload)); return { data: hit, error: null }; }
    if (this.op === 'delete') { db[this.table] = t.filter(r => !hit.includes(r)); return { data: hit, error: null }; }
    const out = [...hit];
    if (this.sort) { const [c, asc] = this.sort; out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1)); }
    return { data: out, error: null };
  }
}

export const supabase = {
  from: (table: string) => new Query(table),
  rpc: async () => ({ data: true, error: null }),
} as any;
export const LAB_KEY_STORAGE = 'lab_access_code';
export const makeClient = () => supabase;
export const supabaseUrl = 'mock';
export const supabaseAnonKey = 'mock';
export default supabase;
