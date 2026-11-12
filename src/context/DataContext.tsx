import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { translations, type Language, type TranslationDictionary } from '../translations';
import type { Player, Coach, JumpMeasurement } from '../types/athletics';
import { birthYearToDob } from '../lib/utils';
import { hpoFromMeasurements } from '../lib/biomechanics';
import { normalizeTestType } from '../lib/testTypes';
import { supabaseErrorAr } from '../lib/supabaseErrors';
import { toast } from '../components/Toast';

interface DataContextType {
  players: Player[];
  coaches: Coach[];
  selectedPlayerId: string;
  activePlayer: Player | null;
  playerHistory: JumpMeasurement[];
  allMeasurements: JumpMeasurement[];
  dataVersion: number;
  isSyncing: boolean;
  /** true until the first load finishes */
  isLoading: boolean;
  /** Arabic message when the last load failed */
  loadError: string | null;
  lastSyncedAt: Date | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
  setSelectedPlayerId: (id: string) => void;
  refreshData: () => Promise<void>;
  addMeasurement: (payload: Partial<JumpMeasurement>) => Promise<JumpMeasurement | null>;
  updateMeasurement: (id: string, updates: Partial<JumpMeasurement>) => Promise<boolean>;
  deleteMeasurement: (id: string) => Promise<boolean>;
  addPlayer: (newPlayer: any) => Promise<Player | null>;
  updatePlayer: (id: string, updates: any) => Promise<boolean>;
  /** Update only the given lab_players columns (nothing else is touched). */
  updatePlayerFields: (id: string, fields: Partial<Pick<Player, 'height_cm' | 'standing_reach_cm' | 'hpo_m'>>) => Promise<boolean>;
  deletePlayer: (id: string) => Promise<boolean>;
  addCoach: (fullName: string) => Promise<Coach | null>;
  deleteCoach: (id: string) => Promise<boolean>;
  toggleFavoritePlayer: (playerId: string, e?: React.MouseEvent) => Promise<void>;
  favoritePlayerIds: string[];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'ar';
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedPlayerId, setSelectedPlayerIdState] = useState<string>('');
  const [allMeasurements, setAllMeasurements] = useState<JumpMeasurement[]>([]);
  // Derived, so they can never drift out of sync with the source arrays
  const activePlayer = useMemo(() => players.find(p => p.id === selectedPlayerId) || null, [players, selectedPlayerId]);
  const playerHistory = useMemo(
    () => (selectedPlayerId ? allMeasurements.filter(m => m.player_id === selectedPlayerId) : []),
    [allMeasurements, selectedPlayerId],
  );
  const sortByCreated = (rows: JumpMeasurement[]) =>
    [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [favoritePlayerIds, setFavoritePlayerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favorite_player_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const t = translations[language];

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Core Central Data Fetching
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch Coaches
      const { data: coachesData } = await supabase
        .from('lab_coaches')
        .select('*')
        .order('full_name', { ascending: true });

      if (coachesData) {
        setCoaches(coachesData as Coach[]);
      }

      // 2. Fetch Players
      const { data: playersData, error: playersError } = await supabase
        .from('lab_players')
        .select('*')
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;
      if (playersData) {
        setPlayers(playersData as Player[]);
      }

      // 3. Fetch All Measurements
      const { data: measurementsData, error: measurementsError } = await supabase
        .from('lab_jump_measurements')
        .select('*')
        .order('created_at', { ascending: true });

      if (measurementsError) throw measurementsError;
      if (measurementsData) {
        setAllMeasurements(measurementsData as JumpMeasurement[]);
      }

      setLastSyncedAt(new Date());
      setDataVersion(v => v + 1);
      setLoadError(null);
    } catch (err) {
      console.error('Error refreshing central data:', err);
      setLoadError(supabaseErrorAr(err, 'تحميل البيانات'));
      toast.error(supabaseErrorAr(err, 'تحميل البيانات'));
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  // One-time migration: height / standing reach used to live in localStorage on this device.
  // Fill only EMPTY lab_players columns; never overwrite a DB value; keep the local keys.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current || players.length === 0) return;
    migratedRef.current = true;
    let done = false;
    try { done = localStorage.getItem('lab_reach_migrated_v1') === '1'; } catch { done = true; }
    if (done) return;
    (async () => {
      const conflicts: Record<string, unknown>[] = [];
      let failed = false;
      for (const p of players) {
        const fields: Partial<Pick<Player, 'height_cm' | 'standing_reach_cm'>> = {};
        const read = (k: string) => { try { return parseFloat(localStorage.getItem(k) || ''); } catch { return NaN; } };
        const h = read(`player_height_${p.id}`);
        const r = read(`standing_reach_${p.id}`);
        if (h > 0) { if (p.height_cm == null) fields.height_cm = h; else if (Number(p.height_cm) !== h) conflicts.push({ id: p.id, field: 'height_cm', db: p.height_cm, local: h }); }
        if (r > 0) { if (p.standing_reach_cm == null) fields.standing_reach_cm = r; else if (Number(p.standing_reach_cm) !== r) conflicts.push({ id: p.id, field: 'standing_reach_cm', db: p.standing_reach_cm, local: r }); }
        if (Object.keys(fields).length) {
          const { error } = await supabase.from('lab_players').update(fields).eq('id', p.id);
          if (error) { failed = true; console.error('reach migration failed for', p.id, error); }
          else setPlayers(prev => prev.map(x => (x.id === p.id ? { ...x, ...fields } : x)));
        }
      }
      try {
        if (conflicts.length) localStorage.setItem('lab_reach_conflicts', JSON.stringify(conflicts));
        if (!failed) localStorage.setItem('lab_reach_migrated_v1', '1');
      } catch { /* ignore */ }
    })();
  }, [players]);

  // Initial load (once)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    refreshData();
  }, [refreshData]);

  // Synchronize activePlayer and playerHistory when selectedPlayerId changes
  const setSelectedPlayerId = useCallback((id: string) => {
    setSelectedPlayerIdState(id);
  }, []);

const VALID_MEASUREMENT_KEYS = new Set([
  'id', 'player_id', 'coach_id', 'test_type', 'jump_height_cm',
  'flight_time_sec', 'takeoff_velocity_ms', 'mean_power_watts',
  'peak_power_watts', 'mean_force_newtons', 'leg_used', 'created_at',
  'rsi_score', 'contact_time_sec', 'f0_value', 'v0_value', 'fvp_slope',
  'added_load_kg', 'clean_weight_kg', 'clean_bw_ratio', 'box_height_cm',
  'notes', 'week_number', 'reps_count'
]);

  // ADD MEASUREMENT (Optimistic & Centralized)
  const addMeasurement = useCallback(async (payload: Partial<JumpMeasurement>): Promise<JumpMeasurement | null> => {
    try {
      setIsSyncing(true);
      // Strip any extra non-existent schema columns to prevent Supabase PGRST204 errors
      const sanitizedPayload = Object.fromEntries(
        Object.entries(payload).filter(([k, v]) => VALID_MEASUREMENT_KEYS.has(k) && v !== undefined)
      );
      if (sanitizedPayload.test_type) sanitizedPayload.test_type = normalizeTestType(String(sanitizedPayload.test_type));

      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .insert([sanitizedPayload])
        .select();

      if (error) {
        console.error('Supabase measurement insert error:', error);
        toast.error(supabaseErrorAr(error, 'حفظ القياس'));
        throw error;
      }

      if (data && data.length > 0) {
        const newRecord = data[0] as JumpMeasurement;

        // Insert the row the server returned; no full re-download
        setAllMeasurements(prev => sortByCreated([...prev, newRecord]));
        setDataVersion(v => v + 1);
        setLastSyncedAt(new Date());
        return newRecord;
      }
      return null;
    } catch (err) {
      console.error('Failed to add measurement:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [language]);

  // UPDATE MEASUREMENT
  const updateMeasurement = useCallback(async (id: string, updates: Partial<JumpMeasurement>): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const clean: Partial<JumpMeasurement> = { ...updates };
      if (clean.test_type) clean.test_type = normalizeTestType(String(clean.test_type));
      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .update(clean)
        .eq('id', id)
        .select();

      if (error) throw error;

      const saved = (data && data[0]) as JumpMeasurement | undefined;
      setAllMeasurements(prev => sortByCreated(prev.map(m => m.id === id ? { ...m, ...(saved || clean) } : m)));
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to update measurement:', err);
      toast.error(supabaseErrorAr(err, 'تعديل القياس'));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // DELETE MEASUREMENT
  const deleteMeasurement = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('lab_jump_measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAllMeasurements(prev => prev.filter(m => m.id !== id));
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to delete measurement:', err);
      toast.error(supabaseErrorAr(err, 'حذف القياس'));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ADD PLAYER
  const addPlayer = useCallback(async (newPlayerData: any): Promise<Player | null> => {
    try {
      setIsSyncing(true);
      const payload = {
        full_name: newPlayerData.name,
        date_of_birth: birthYearToDob(newPlayerData.birthYear),
        weight_kg: parseFloat(newPlayerData.weight) || 70,
        leg_length_m: parseFloat(newPlayerData.leg) || 1.0,
        gender: newPlayerData.gender || 'male',
        height_cm: parseFloat(newPlayerData.height) || null,
        standing_reach_cm: parseFloat(newPlayerData.standingReach) || null,
        hpo_m: hpoFromMeasurements(parseFloat(newPlayerData.leg), parseFloat(newPlayerData.squatHeight)),
        coach_id: newPlayerData.coachId || null,
      };

      const { data, error } = await supabase
        .from('lab_players')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const createdPlayer = data[0] as Player;
        setPlayers(prev => [createdPlayer, ...prev]);
        setSelectedPlayerId(createdPlayer.id);
        setDataVersion(v => v + 1);
        return createdPlayer;
      }
      return null;
    } catch (err) {
      console.error('Failed to add player:', err);
      toast.error(supabaseErrorAr(err, 'حفظ اللاعب'));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [setSelectedPlayerId, language]);

  // UPDATE PLAYER
  const updatePlayer = useCallback(async (id: string, updates: any): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const payload = {
        full_name: updates.name,
        date_of_birth: birthYearToDob(updates.birthYear, players.find(p => p.id === id)?.date_of_birth),
        weight_kg: parseFloat(updates.weight) || 70,
        leg_length_m: parseFloat(updates.leg) || 1.0,
        gender: updates.gender || 'male',
        height_cm: parseFloat(updates.height) || null,
        standing_reach_cm: parseFloat(updates.standingReach) || null,
        hpo_m: hpoFromMeasurements(parseFloat(updates.leg), parseFloat(updates.squatHeight)),
        coach_id: updates.coachId || null,
      };

      const { error } = await supabase
        .from('lab_players')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to update player:', err);
      toast.error(supabaseErrorAr(err, 'تعديل اللاعب'));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedPlayerId, players, language]);

  // UPDATE ONLY SOME PLAYER COLUMNS
  const updatePlayerFields = useCallback(async (id: string, fields: Partial<Pick<Player, 'height_cm' | 'standing_reach_cm' | 'hpo_m'>>): Promise<boolean> => {
    const { error } = await supabase.from('lab_players').update(fields).eq('id', id);
    if (error) {
      console.error('Failed to update player fields:', error);
      toast.error(supabaseErrorAr(error, 'حفظ بيانات اللاعب'));
      return false;
    }
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...fields } : p)));
    return true;
  }, []);

  // DELETE PLAYER
  const deletePlayer = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('lab_players')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPlayers(prev => prev.filter(p => p.id !== id));
      if (selectedPlayerId === id) {
        setSelectedPlayerIdState('');
      }
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to delete player:', err);
      toast.error(supabaseErrorAr(err, 'حذف اللاعب'));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedPlayerId]);

  // ADD COACH
  const addCoach = useCallback(async (fullName: string): Promise<Coach | null> => {
    try {
      setIsSyncing(true);
      const { data, error } = await supabase
        .from('lab_coaches')
        .insert([{ full_name: fullName.trim() }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const created = data[0] as Coach;
        setCoaches(prev => [...prev, created]);
        setDataVersion(v => v + 1);
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to add coach:', err);
      toast.error(supabaseErrorAr(err, 'إضافة المدرب'));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // DELETE COACH
  const deleteCoach = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('lab_coaches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCoaches(prev => prev.filter(c => c.id !== id));
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to delete coach:', err);
      toast.error(supabaseErrorAr(err, 'حذف المدرب'));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // FAVORITES
  const toggleFavoritePlayer = useCallback(async (playerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isFav = favoritePlayerIds.includes(playerId);
    const newFavState = !isFav;

    setFavoritePlayerIds(prev => {
      const updated = newFavState
        ? [...prev.filter(id => id !== playerId), playerId]
        : prev.filter(id => id !== playerId);
      localStorage.setItem('favorite_player_ids', JSON.stringify(updated));
      return updated;
    });

    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_favorite: newFavState } : p));

    try {
      await supabase
        .from('lab_players')
        .update({ is_favorite: newFavState })
        .eq('id', playerId);
    } catch (err) {
      console.error('Failed to toggle favorite on Supabase:', err);
      toast.error(supabaseErrorAr(err, 'تحديث المفضلة'));
    }
  }, [favoritePlayerIds]);

  return (
    <DataContext.Provider
      value={{
        players,
        coaches,
        selectedPlayerId,
        activePlayer,
        playerHistory,
        allMeasurements,
        dataVersion,
        isSyncing,
        isLoading,
        loadError,
        lastSyncedAt,
        language,
        setLanguage,
        t,
        setSelectedPlayerId,
        refreshData,
        addMeasurement,
        updateMeasurement,
        deleteMeasurement,
        addPlayer,
        updatePlayer,
        updatePlayerFields,
        deletePlayer,
        addCoach,
        deleteCoach,
        toggleFavoritePlayer,
        favoritePlayerIds,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
