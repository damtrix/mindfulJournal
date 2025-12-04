import { User, JournalEntry } from '../types';
import { getSupabaseClient } from './supabaseClient';

// Helper to map Supabase user to our App User type
const mapUser = (sbUser: any): User => ({
  id: sbUser.id,
  email: sbUser.email || '',
  name: sbUser.user_metadata?.name || 'Friend',
  createdAt: sbUser.created_at,
});

// Helper to map DB snake_case to TS camelCase
const mapEntryFromDB = (data: any): JournalEntry => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  content: data.content,
  mood: data.mood,
  tags: data.tags || [],
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  aiReflection: data.ai_reflection,
});

export const StorageService = {
  // --- Auth & User Management ---

  async register(email: string, password: string, name: string): Promise<User> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    // If Supabase requires email confirmation, session will be null.
    // We throw a specific error so the UI can show a success/info message instead of logging them in.
    if (!data.session) {
      throw new Error(
        'Account created! Please check your email to confirm your registration before logging in.'
      );
    }

    return mapUser(data.user);
  },

  async login(email: string, password: string): Promise<User> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Login failed');

    return mapUser(data.user);
  },

  async logout(): Promise<void> {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession(): Promise<User | null> {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return mapUser(data.session.user);
  },

  // --- Journal Entries ---

  async getEntries(userId: string): Promise<JournalEntry[]> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapEntryFromDB);
  },

  async saveEntry(entry: JournalEntry): Promise<JournalEntry> {
    // Map TS camelCase to DB snake_case
    const dbEntry = {
      id: entry.id,
      user_id: entry.userId,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags,
      ai_reflection: entry.aiReflection,
      updated_at: new Date().toISOString(),
      // We prioritize the existing createdAt if it exists (update), else use now
      created_at: entry.createdAt,
    };

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('entries')
      .upsert(dbEntry)
      .select()
      .single();

    if (error) throw error;

    return mapEntryFromDB(data);
  },

  async deleteEntry(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('entries').delete().eq('id', id);

    if (error) throw error;
  },
};
