import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://azdvrxkbucjtrixycwxp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6ZHZyeGtidWNqdHJpeHljd3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODc2MTcsImV4cCI6MjEwMjU2MzYxN30.5t51xlXbLHnRGOcPYMGFaEEafisdobL9Nm_TI69mpoE';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser: User | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser = session?.user || null;
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user) {
      this.currentUser = data.session.user;
      return this.currentUser;
    }
    try {
      const { data: userData } = await this.supabase.auth.getUser();
      this.currentUser = userData.user;
      return this.currentUser;
    } catch {
      return null;
    }
  }

  async signOut() {
    this.currentUser = null;
    return this.supabase.auth.signOut();
  }
}