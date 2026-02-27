import { supabase } from './supabase.js';

export async function fetchHabits(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    defaultFocusMinutes: row.default_focus_minutes,
    createdAt: row.created_at,
  }));
}

export async function insertHabit(userId, habit) {
  if (!supabase || !userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name: habit.name || 'New habit',
      icon: habit.icon || 'book',
      default_focus_minutes: habit.defaultFocusMinutes ?? null,
    })
    .select('id, name, icon, default_focus_minutes, created_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    defaultFocusMinutes: data.default_focus_minutes,
    createdAt: data.created_at,
  };
}

export async function updateHabitDb(userId, id, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.defaultFocusMinutes !== undefined) payload.default_focus_minutes = updates.defaultFocusMinutes ?? null;
  if (!supabase || !userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('habits')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data ? { id: data.id, name: data.name, icon: data.icon, defaultFocusMinutes: data.default_focus_minutes, createdAt: data.created_at } : null;
}

export async function deleteHabitDb(userId, id) {
  if (!supabase || !userId) throw new Error('Not authenticated');
  await supabase.from('sessions').delete().eq('habit_id', id).eq('user_id', userId);
  await supabase.from('completions').delete().eq('habit_id', id).eq('user_id', userId);
  const { error } = await supabase.from('habits').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchSessions(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (error) return []; // table may not exist yet
  return (data || []).map(row => ({
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    focusMinutes: row.focus_minutes || 0,
    createdAt: row.created_at,
  }));
}

export async function insertSession(userId, habitId, date, focusMinutes) {
  if (!supabase || !userId) return null;
  const { error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      habit_id: habitId,
      date,
      focus_minutes: focusMinutes,
    });
  if (error) {
    console.warn('insertSession failed (table may not exist):', error.message);
    return null;
  }
  return { habitId, date, focusMinutes };
}

export async function fetchCompletions(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(row => ({
    habitId: row.habit_id,
    date: row.date,
    focusMinutes: row.focus_minutes || 0,
  }));
}

export async function upsertCompletion(userId, habitId, date, focusMinutes) {
  if (!supabase || !userId) throw new Error('Not authenticated');
  const { data: existing } = await supabase
    .from('completions')
    .select('id, focus_minutes')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('date', date)
    .maybeSingle();
  if (existing) {
    const newMins = (existing.focus_minutes || 0) + focusMinutes;
    const { error } = await supabase
      .from('completions')
      .update({ focus_minutes: newMins })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('completions').insert({
      user_id: userId,
      habit_id: habitId,
      date,
      focus_minutes: focusMinutes,
    });
    if (error) {
      if (error.code === '23505') {
        const { data: row } = await supabase
          .from('completions')
          .select('id, focus_minutes')
          .eq('user_id', userId)
          .eq('habit_id', habitId)
          .eq('date', date)
          .maybeSingle();
        if (row) {
          const newMins = (row.focus_minutes || 0) + focusMinutes;
          await supabase
            .from('completions')
            .update({ focus_minutes: newMins })
            .eq('id', row.id);
          return;
        }
      }
      throw error;
    }
  }
}

export async function toggleCompletionDb(userId, habitId, date, focusMinutes = null) {
  if (!supabase || !userId) throw new Error('Not authenticated');
  const { data: existing } = await supabase
    .from('completions')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('date', date)
    .maybeSingle();
  if (existing) {
    await supabase.from('completions').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('completions').insert({
      user_id: userId,
      habit_id: habitId,
      date,
      focus_minutes: focusMinutes ?? 0,
    });
    return true;
  }
}
