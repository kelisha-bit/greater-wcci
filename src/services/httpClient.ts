/**
 * API Client
 * HTTP client with interceptors for request/response handling, error management, and token management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT ? parseInt(import.meta.env.VITE_API_TIMEOUT) : 30000;
const MAX_RETRIES = import.meta.env.VITE_API_MAX_RETRIES ? parseInt(import.meta.env.VITE_API_MAX_RETRIES) : 3;
const RETRY_DELAY = import.meta.env.VITE_API_RETRY_DELAY ? parseInt(import.meta.env.VITE_API_RETRY_DELAY) : 1000;

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
  path?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static from(error: any, url?: string): ApiError {
    // Network error
    if (!error.response) {
      return new ApiError(
        error.message || 'Network error. Please check your connection.',
        'NETWORK_ERROR',
        0,
        { originalError: error.message, url }
      );
    }

    // API error response
    const response = error.response;
    const data = response.data as ApiErrorResponse | undefined;

    return new ApiError(
      data?.error || response.statusText || 'An error occurred',
      data?.code || `HTTP_${response.status}`,
      response.status,
      data?.details || { status: response.status }
    );
  }
}

// ============================================================================
// Request/Response Interceptor Types
// ============================================================================

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
}

export interface ResponseData {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: ResponseData) => ResponseData | Promise<ResponseData>;
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

// ============================================================================
// API Client
// ============================================================================

export class HTTPClient {
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(
    baseURL: string = API_BASE_URL,
    timeout: number = API_TIMEOUT,
    maxRetries: number = MAX_RETRIES,
    retryDelay: number = RETRY_DELAY
  ) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Add a request interceptor
   */
  useRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  useResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add an error interceptor
   */
  useErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Make HTTP GET request
   */
  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('GET', url, { params, headers });
  }

  /**
   * Make HTTP POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('POST', url, { body, headers });
  }

  /**
   * Make HTTP PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('PUT', url, { body, headers });
  }

  /**
   * Make HTTP PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('PATCH', url, { body, headers });
  }

  /**
   * Make HTTP DELETE request
   */
  async delete<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('DELETE', url, { body, headers });
  }

  /**
   * Generic request method with retry logic
   */
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
    url: string,
    options: {
      body?: any;
      params?: Record<string, any>;
      headers?: Record<string, string>;
      retries?: number;
    } = {}
  ): Promise<T> {
    const { body, params, headers = {}, retries = this.maxRetries } = options;

    let config: RequestConfig = {
      url: this.resolveURL(url),
      method,
      headers: this.getHeaders(headers),
      body,
      params,
      timeout: this.timeout,
      retries,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    try {
      // Make the request
      const response = await this.performRequest(config);

      let responseData: ResponseData = {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        responseData = await interceptor(responseData);
      }

      // Return data directly (assume endpoint returns data, not wrapped response)
      return responseData.data as T;
    } catch (error: any) {
      // Convert to ApiError
      let apiError = error instanceof ApiError ? error : ApiError.from(error, config.url);

      // Apply error interceptors
      for (const interceptor of this.errorInterceptors) {
        apiError = await interceptor(apiError);
      }

      // Retry logic for specific status codes
      if (this.shouldRetry(apiError.status, retries)) {
        await this.delay(this.retryDelay);
        return this.request<T>(method, url, {
          body,
          params,
          headers,
          retries: retries - 1,
        });
      }

      throw apiError;
    }
  }

  /**
   * Perform the actual HTTP request using fetch
   */
  private async performRequest(config: RequestConfig): Promise<ResponseData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const url = this.buildURL(config.url, config.params);

      const fetchOptions: RequestInit = {
        method: config.method,
        headers: config.headers,
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (config.body && config.method !== 'GET') {
        fetchOptions.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, fetchOptions);

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }

      // Handle non-2xx responses
      if (!response.ok) {
        throw new ApiError(
          data?.error || response.statusText || 'HTTP Error',
          data?.code || `HTTP_${response.status}`,
          response.status,
          data?.details || data
        );
      }

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 'TIMEOUT_ERROR', 0);
      }

      // Re-throw ApiErrors
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        error.message || 'Network error',
        'NETWORK_ERROR',
        0,
        { originalError: error.message }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(status: number, retriesLeft: number): boolean {
    if (retriesLeft <= 0) return false;

    // Retry on network errors (status 0/undefined) or 5xx errors
    const isRetryableStatus = status === 0 || (status >= 500 && status < 600);

    // Also retry on 429 (Too Many Requests - rate limiting)
    return isRetryableStatus || status === 429;
  }

  /**
   * Resolve full URL
   */
  private resolveURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const cleanBase = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;

    return `${cleanBase}${cleanPath}`;
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(url: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const queryString = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryString.append(key, String(v)));
        } else {
          queryString.set(key, String(value));
        }
      }
    });

    const query = queryString.toString();
    return query ? `${url}?${query}` : url;
  }

  /**
   * Get default headers with content-type and auth token
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Get auth token from storage (can be overridden)
   */
  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<{ baseURL: string; timeout: number; maxRetries: number; retryDelay: number }>) {
    if (config.baseURL) this.baseURL = config.baseURL;
    if (config.timeout) this.timeout = config.timeout;
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const httpClient = new HTTPClient();

/**
 * Get or create HTTP client instance
 */
export function createHttpClient(baseURL?: string): HTTPClient {
  if (baseURL) {
    httpClient.setConfig({ baseURL });
  }
  return httpClient;
}
