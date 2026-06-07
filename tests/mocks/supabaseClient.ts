import { vi } from 'vitest';

export interface InviteCode {
  code: string;
  is_used: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  date_of_birth: string;
  weight_kg: number;
  leg_length_m: number;
  gender: 'male' | 'female';
  created_at: string;
  coach_id?: string;
}

export interface Measurement {
  id: string;
  player_id: string;
  test_type: 'standard' | 'rsi';
  jump_height_cm: number;
  flight_time_sec: number;
  contact_time_sec?: number;
  rsi_score?: number;
  takeoff_velocity_ms?: number;
  mean_power_watts?: number;
  peak_power_watts?: number;
  created_at: string;
}

// Stateful In-Memory Arrays representing DB tables
export let mockSession: any = {
  user: {
    id: 'd3b07384-d113-4956-a5db-630d7830be1e',
    email: 'coach@thelab.com'
  },
  access_token: 'mock-jwt-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600
};
export let authStateCallbacks: Array<(event: string, session: any) => void> = [];

export const mockDb: Record<string, any[]> = {
  invite_codes: [
    { code: 'LAB-TEST01', is_used: false, created_at: new Date().toISOString() },
    { code: 'LAB-USED02', is_used: true, created_at: new Date().toISOString() },
  ],
  lab_players: [],
  lab_jump_measurements: [],
  lab_coaches: [],
  players: [],
  jump_measurements: []
};

export const resetMockDb = () => {
  mockSession = {
    user: {
      id: 'd3b07384-d113-4956-a5db-630d7830be1e',
      email: 'coach@thelab.com'
    },
    access_token: 'mock-jwt-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  };
  authStateCallbacks = [];
  mockDb.invite_codes = [
    { code: 'LAB-TEST01', is_used: false, created_at: new Date().toISOString() },
    { code: 'LAB-USED02', is_used: true, created_at: new Date().toISOString() },
  ];
  mockDb.lab_players = [];
  mockDb.lab_jump_measurements = [];
  mockDb.lab_coaches = [];
  mockDb.players = [];
  mockDb.jump_measurements = [];
};

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private sortField: string | null = null;
  private sortAscending: boolean = true;
  private fetchSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.sortField = column;
    this.sortAscending = ascending;
    return this;
  }

  single() {
    this.fetchSingle = true;
    return this;
  }

  // Thenable implementation to await builder chain directly
  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  private async execute() {
    if (!mockDb[this.table]) {
      mockDb[this.table] = [];
    }
    let data = [...mockDb[this.table]];

    for (const filterFn of this.filters) {
      data = data.filter(filterFn);
    }

    if (this.sortField) {
      data.sort((a, b) => {
        const valA = a[this.sortField!];
        const valB = b[this.sortField!];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    if (this.fetchSingle) {
      if (data.length === 0) {
        return { data: null, error: new Error('Row not found') };
      }
      return { data: data[0], error: null };
    }

    return { data, error: null };
  }

  async insert(rows: any[]) {
    if (!mockDb[this.table]) {
      mockDb[this.table] = [];
    }
    const tableData = mockDb[this.table];
    const inserted = rows.map((row) => {
      const newRow = {
        id: Math.random().toString(36).substring(7),
        created_at: new Date().toISOString(),
        ...row,
      };
      tableData.push(newRow);
      return newRow;
    });
    return { 
      data: inserted, 
      error: null,
      select() {
        return {
          then(resolve: any) {
            resolve({ data: inserted, error: null });
          }
        };
      }
    };
  }

  async update(changes: any) {
    if (!mockDb[this.table]) {
      mockDb[this.table] = [];
    }
    const tableData = mockDb[this.table];
    const updatedRows: any[] = [];
    
    mockDb[this.table] = tableData.map((item) => {
      const matches = this.filters.every((filterFn) => filterFn(item));
      if (matches) {
        const updated = { ...item, ...changes };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    });

    return { data: updatedRows, error: null };
  }

  async delete() {
    if (!mockDb[this.table]) {
      mockDb[this.table] = [];
    }
    const tableData = mockDb[this.table];
    const remaining: any[] = [];
    const deleted: any[] = [];

    tableData.forEach((item) => {
      const matches = this.filters.every((filterFn) => filterFn(item));
      if (matches) {
        deleted.push(item);
      } else {
        remaining.push(item);
      }
    });

    mockDb[this.table] = remaining;
    return { data: deleted, error: null };
  }
}

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: mockSession }, error: null };
    },
    onAuthStateChange(callback: any) {
      authStateCallbacks.push(callback);
      // Trigger initial trigger
      callback('INITIAL_SESSION', mockSession);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
            }
          }
        }
      };
    },
    async signInWithPassword({ email, password }: any) {
      if (password === 'wrongpassword') {
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
      }
      mockSession = {
        user: { id: 'test-coach-uuid', email },
        access_token: 'mock-jwt-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      authStateCallbacks.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    async signUp({ email, password }: any) {
      mockSession = {
        user: { id: 'test-coach-uuid', email },
        access_token: 'mock-jwt-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      authStateCallbacks.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    async signOut() {
      mockSession = null;
      authStateCallbacks.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    }
  },
  from(table: string) {
    return new MockQueryBuilder(table);
  }
};
