// Client-side API template
// Auto-generated TypeScript API client for browser/client usage

{{type_imports}}

/**
 * {{handler_name}} - {{method}} {{route_path}}
 * @param data - Request parameters
 * @returns Promise with response data
 */
export async function {{function_name}}(data: {{params_type}}): Promise<{{return_type}}> {
  const response = await {{http_method}}<{{return_type}}>(`{{route_url}}`, data, {{require_auth}})
  return response
}