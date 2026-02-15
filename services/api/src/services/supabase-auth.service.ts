import type { Session, User as SupabaseUser, Provider } from "@supabase/supabase-js";
import { getSupabaseClient } from "../config/supabase";

export interface FormattedSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

export interface SignUpResult {
  user: SupabaseUser | null;
  session: FormattedSession | null;
}

export interface SignInResult {
  user: SupabaseUser | null;
  session: FormattedSession | null;
}

export interface OAuthSignInResult {
  user: SupabaseUser | null;
  session: FormattedSession | null;
}

export interface RefreshResult {
  session: FormattedSession | null;
}

export class SupabaseAuthService {
  private getClient() {
    const client = getSupabaseClient();
    if (!client) {
      throw new SupabaseUnavailableError();
    }
    return client;
  }

  private formatSession(session: Session | null): FormattedSession | null {
    if (!session) return null;

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at ?? 0,
    };
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const client = this.getClient();

    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }

    return {
      user: data.user,
      session: this.formatSession(data.session),
    };
  }

  async signInWithPassword(email: string, password: string): Promise<SignInResult> {
    const client = this.getClient();

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }

    return {
      user: data.user,
      session: this.formatSession(data.session),
    };
  }

  async signInWithIdToken(params: {
    provider: Provider;
    token: string;
    access_token?: string;
    nonce?: string;
  }): Promise<OAuthSignInResult> {
    const client = this.getClient();

    const { data, error } = await client.auth.signInWithIdToken({
      provider: params.provider,
      token: params.token,
      access_token: params.access_token,
      nonce: params.nonce,
    });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }

    return {
      user: data.user,
      session: this.formatSession(data.session),
    };
  }

  async refreshSession(refreshToken: string): Promise<RefreshResult> {
    const client = this.getClient();

    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }

    return {
      session: this.formatSession(data.session),
    };
  }

  async signOut(): Promise<void> {
    const client = this.getClient();
    await client.auth.signOut();
  }

  async resetPasswordForEmail(email: string, redirectTo: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }
  }

  async updateUserPassword(password: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client.auth.updateUser({ password });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }
  }

  isAvailable(): boolean {
    try {
      this.getClient();
      return true;
    } catch {
      return false;
    }
  }
}

export class SupabaseUnavailableError extends Error {
  constructor() {
    super("Supabase service is temporarily unavailable");
    this.name = "SupabaseUnavailableError";
  }
}

export class SupabaseAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAuthError";
  }
}
