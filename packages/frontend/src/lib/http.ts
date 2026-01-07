import { API_BASE_URL } from "@/lib/constants";

interface ApiResponse<T> {
  code: number;
  msg?: string;
  data?: T;
}

async function request<TRequest, TResponse>(
  method: string,
  url: string,
  body?: TRequest
): Promise<ApiResponse<TResponse>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    const jsonResponse: ApiResponse<TResponse> = await response.json();

    if (!response.ok || jsonResponse.code !== 0) {
      // Handle API errors or non-2xx HTTP status codes
      console.error(`API Error: ${jsonResponse.msg || response.statusText}`);
      throw new Error(jsonResponse.msg || "An unknown API error occurred.");
    }

    return jsonResponse;
  } catch (error) {
    console.error(`Network or parsing error: ${error}`);
    throw error;
  }
}

export function get<TResponse>(
  url: string
): Promise<ApiResponse<TResponse>> {
  return request<undefined, TResponse>("GET", url);
}

export function post<TRequest, TResponse>(
  url: string,
  body: TRequest
): Promise<ApiResponse<TResponse>> {
  return request<TRequest, TResponse>("POST", url, body);
}

export function put<TRequest, TResponse>(
  url: string,
  body: TRequest
): Promise<ApiResponse<TResponse>> {
  return request<TRequest, TResponse>("PUT", url, body);
}

export function del<TResponse>(
  url: string
): Promise<ApiResponse<TResponse>> {
  return request<undefined, TResponse>("DELETE", url);
}
