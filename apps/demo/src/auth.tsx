import { createContext, useContext, type ReactNode } from 'react';
import { createClient, type LitemetricsClient } from '@litemetrics/client';

const mockClient = createClient({ baseUrl: '', siteId: 'demo' });

interface AuthContextValue {
  adminSecret: string | null;
  isAuthenticated: boolean;
  login: (secret: string) => Promise<boolean>;
  logout: () => void;
  client: LitemetricsClient;
}

const ctx: AuthContextValue = {
  adminSecret: 'demo-secret',
  isAuthenticated: true,
  login: async () => true,
  logout: () => {},
  client: mockClient,
};

const AuthContext = createContext<AuthContextValue>(ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
