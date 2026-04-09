/**
 * Token Management & Authentication
 * Handles JWT token storage, retrieval, and refresh logic
 */

const TOKEN_STORAGE_KEY = 'church_app_auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'church_app_refresh_token';
const TOKEN_EXPIRY_KEY = 'church_app_token_expiry';

export interface AuthTokenInfo {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
  type?: string;
}

export interface DecodedToken {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  name?: string;
  [key: string]: any;
}

// ============================================================================
// Token Management
// ============================================================================

export class TokenManager {
  /**
   * Store authentication tokens
   */
  static setTokens(tokenInfo: AuthTokenInfo): void {
    try {
      // Store access token
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenInfo.token);

      // Store refresh token if provided
      if (tokenInfo.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenInfo.refreshToken);
      }

      // Calculate and store expiry time
      if (tokenInfo.expiresIn) {
        const expiresAt = Date.now() + tokenInfo.expiresIn * 1000; // Convert to milliseconds
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
      }
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    try {
      // Check if token is expired
      if (this.isTokenExpired()) {
        this.clearTokens();
        return null;
      }

      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Check if token exists and is valid
   */
  static hasValidToken(): boolean {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      return false;
    }

    return !this.isTokenExpired();
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(): boolean {
    try {
      const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);

      if (!expiryStr) {
        // Try to decode and check exp claim
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
          const decoded = this.decodeToken(token);
          if (decoded.exp) {
            const isExpired = decoded.exp * 1000 < Date.now();
            return isExpired;
          }
        }
        return false;
      }

      const expiresAt = parseInt(expiryStr, 10);

      // Consider expired if within 1 minute of expiry (allow refresh)
      return expiresAt < Date.now() + 60000;
    } catch (error) {
      console.error('Failed to check token expiry:', error);
      return true;
    }
  }

  /**
   * Clear all stored tokens
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Decode JWT token (basic decoding, does not verify signature)
   */
  static decodeToken(token: string): DecodedToken {
    try {
      // Split token into parts
      const parts = token.split('.');

      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      // Decode payload (second part)
      const payload = parts[1];
      const decoded = JSON.parse(this.base64UrlDecode(payload));

      return decoded;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return {};
    }
  }

  /**
   * Get user information from stored token
   */
  static getUserFromToken(): AuthUser | null {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!token) {
        return null;
      }

      const decoded = this.decodeToken(token);

      return {
        id: decoded.sub || '',
        email: decoded.email || '',
        role: decoded.role,
        name: decoded.name,
      };
    } catch (error) {
      console.error('Failed to get user from token:', error);
      return null;
    }
  }

  /**
   * Base64 URL decode helper
   */
  private static base64UrlDecode(str: string): string {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');

    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw new Error('Invalid base64url string');
    }

    try {
      return decodeURIComponent(atob(output).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch {
      return atob(output);
    }
  }
}

// ============================================================================
// Session Management
// ============================================================================

export class SessionManager {
  private static listeners: Set<(isAuthenticated: boolean) => void> = new Set();

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return TokenManager.hasValidToken();
  }

  /**
   * Create session after login
   */
  static createSession(tokenInfo: AuthTokenInfo): void {
    TokenManager.setTokens(tokenInfo);
    this.notifyListeners(true);
  }

  /**
   * Destroy session on logout
   */
  static destroySession(): void {
    TokenManager.clearTokens();
    this.notifyListeners(false);
  }

  /**
   * Subscribe to authentication changes
   */
  static onAuthChange(callback: (isAuthenticated: boolean) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private static notifyListeners(isAuthenticated: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isAuthenticated);
      } catch (error) {
        console.error('Error in auth change listener:', error);
      }
    });
  }
}

// ============================================================================
// Axios/Fetch Configuration
// ============================================================================

/**
 * Configure HTTP client with authentication interceptors
 */
export function setupAuthInterceptors(httpClient: any): void {
  // Request interceptor - add token to requests
  httpClient.useRequestInterceptor(async (config: any) => {
    const token = TokenManager.getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  });

  // Response interceptor - handle 401 (token refresh would go here)
  httpClient.useResponseInterceptor(async (response: any) => {
    return response;
  });

  // Error interceptor - handle 401 responses
  httpClient.useErrorInterceptor(async (error: any) => {
    if (error.status === 401) {
      // Token might be invalid, clear it
      TokenManager.clearTokens();
      SessionManager.destroySession();

      // Optionally redirect to login
      // window.location.href = '/login';
    }

    throw error;
  });
}

// ============================================================================
// Token Refresh Logic (placeholder for actual implementation)
// ============================================================================

/**
 * Attempt to refresh access token using refresh token
 * This would typically be called when API returns 401
 */
export async function refreshAccessToken(
  refreshTokenFn: (refreshToken: string) => Promise<AuthTokenInfo>
): Promise<boolean> {
  try {
    const refreshToken = TokenManager.getRefreshToken();

    if (!refreshToken) {
      SessionManager.destroySession();
      return false;
    }

    // Call refresh endpoint
    const newTokenInfo = await refreshTokenFn(refreshToken);

    // Store new tokens
    TokenManager.setTokens(newTokenInfo);

    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    SessionManager.destroySession();
    return false;
  }
}

// ============================================================================
// Utility Exports
// ============================================================================

export const authTokens = {
  get: () => ({
    access: TokenManager.getAccessToken(),
    refresh: TokenManager.getRefreshToken(),
  }),

  set: (tokenInfo: AuthTokenInfo) => TokenManager.setTokens(tokenInfo),

  clear: () => TokenManager.clearTokens(),

  isValid: () => TokenManager.hasValidToken(),

  user: () => TokenManager.getUserFromToken(),
};
