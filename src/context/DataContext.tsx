import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { translations, type Language, type TranslationDictionary } from '../translations';
import type { Player, Coach, JumpMeasurement } from '../types/athletics';

interface DataContextType {
  players: Player[];
  coaches: Coach[];
  selectedPlayerId: string;
  activePlayer: Player | null;
  playerHistory: JumpMeasurement[];
  allMeasurements: JumpMeasurement[];
  dataVersion: number;
  isSyncing: boolean;
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
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [playerHistory, setPlayerHistory] = useState<JumpMeasurement[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<JumpMeasurement[]>([]);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
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
      const { data: playersData } = await supabase
        .from('lab_players')
        .select('*')
        .order('created_at', { ascending: false });

      if (playersData) {
        setPlayers(playersData as Player[]);
      }

      // 3. Fetch All Measurements
      const { data: measurementsData } = await supabase
        .from('lab_jump_measurements')
        .select('*')
        .order('created_at', { ascending: true });

      if (measurementsData) {
        const typedMeasurements = measurementsData as JumpMeasurement[];
        setAllMeasurements(typedMeasurements);

        // Update active player's history in memory immediately
        if (selectedPlayerId) {
          const currentAthleteHistory = typedMeasurements.filter(m => m.player_id === selectedPlayerId);
          setPlayerHistory(currentAthleteHistory);
        }
      }

      setLastSyncedAt(new Date());
      setDataVersion(v => v + 1);
    } catch (err) {
      console.error('Error refreshing central data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedPlayerId]);

  // Initial Load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Synchronize activePlayer and playerHistory when selectedPlayerId changes
  const setSelectedPlayerId = useCallback((id: string) => {
    setSelectedPlayerIdState(id);
    if (!id) {
      setActivePlayer(null);
      setPlayerHistory([]);
      return;
    }

    const matchedPlayer = players.find(p => p.id === id) || null;
    setActivePlayer(matchedPlayer);

    const athleteMeasurements = allMeasurements.filter(m => m.player_id === id);
    setPlayerHistory(athleteMeasurements);
  }, [players, allMeasurements]);

  // Auto-sync active player object when players array changes
  useEffect(() => {
    if (selectedPlayerId) {
      const matched = players.find(p => p.id === selectedPlayerId);
      if (matched) {
        setActivePlayer(matched);
      }
    }
  }, [players, selectedPlayerId]);

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

      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .insert([sanitizedPayload])
        .select();

      if (error) {
        console.error('Supabase measurement insert error:', error);
        alert(language === 'ar' ? `تعذر حفظ القياس: ${error.message}` : `Failed to save measurement: ${error.message}`);
        throw error;
      }

      if (data && data.length > 0) {
        const newRecord = data[0] as JumpMeasurement;

        // Optimistically update states in memory instantly
        setAllMeasurements(prev => [...prev, newRecord]);
        if (newRecord.player_id === selectedPlayerId) {
          setPlayerHistory(prev => [...prev, newRecord]);
        }
        setDataVersion(v => v + 1);
        setLastSyncedAt(new Date());

        // Background sync to ensure full parity
        setTimeout(() => {
          refreshData();
        }, 100);

        return newRecord;
      }
      return null;
    } catch (err) {
      console.error('Failed to add measurement:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedPlayerId, refreshData, language]);

  // UPDATE MEASUREMENT
  const updateMeasurement = useCallback(async (id: string, updates: Partial<JumpMeasurement>): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('lab_jump_measurements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setAllMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      setPlayerHistory(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to update measurement:', err);
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
      setPlayerHistory(prev => prev.filter(m => m.id !== id));
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to delete measurement:', err);
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
        birth_year: parseInt(newPlayerData.birthYear) || null,
        weight_kg: parseFloat(newPlayerData.weight) || 70,
        leg_length_m: parseFloat(newPlayerData.leg) || 1.0,
        gender: newPlayerData.gender || 'male',
        height_cm: parseFloat(newPlayerData.height) || null,
        standing_reach_cm: parseFloat(newPlayerData.standingReach) || null,
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
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [setSelectedPlayerId]);

  // UPDATE PLAYER
  const updatePlayer = useCallback(async (id: string, updates: any): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const payload = {
        full_name: updates.name,
        birth_year: parseInt(updates.birthYear) || null,
        weight_kg: parseFloat(updates.weight) || 70,
        leg_length_m: parseFloat(updates.leg) || 1.0,
        gender: updates.gender || 'male',
        height_cm: parseFloat(updates.height) || null,
        standing_reach_cm: parseFloat(updates.standingReach) || null,
        coach_id: updates.coachId || null,
      };

      const { error } = await supabase
        .from('lab_players')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
      if (selectedPlayerId === id) {
        setActivePlayer(prev => prev ? { ...prev, ...payload } : null);
      }
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to update player:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedPlayerId]);

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
        setActivePlayer(null);
        setPlayerHistory([]);
      }
      setDataVersion(v => v + 1);
      return true;
    } catch (err) {
      console.error('Failed to delete player:', err);
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
