import { API_BASE_URL } from "@/lib/constants";
import { cookies } from "next/headers";

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
    const manage = await cookies();
    config.headers = {
        cookie: manage.toString(),
        "Content-Type": "application/json",
    };
    console.log(config);
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    const jsonResponse: ApiResponse<TResponse> = await response.json();

    if (!response.ok || jsonResponse.code !== 0) {
      // Handle API errors or non-2xx HTTP status codes
      console.log(`to `, url);
      console.log(jsonResponse);
      console.error(`API Error: ${jsonResponse || response.statusText}`);
      throw new Error(jsonResponse.error || jsonResponse.message);
    }


    return jsonResponse;
  } catch (error) {
    console.error(`Network or parsing error: ${error}`);
    throw error;
  }
}

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    } else {
      query.append(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function get<TResponse>(
  url: string,
  params?: Record<string, any>
): Promise<ApiResponse<TResponse>> {
  return request<undefined, TResponse>("GET", `${url}${buildQueryString(params)}`);
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
  url: string,
  params?: Record<string, any>
): Promise<ApiResponse<TResponse>> {
  return request<undefined, TResponse>("DELETE", `${url}${buildQueryString(params)}`);
}
