import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://azdvrxkbucjtrixycwxp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6ZHZyeGtidWNqdHJpeHljd3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODc2MTcsImV4cCI6MjEwMjU2MzYxN30.5t51xlXbLHnRGOcPYMGFaEEafisdobL9Nm_TI69mpoE';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
      },
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }
}