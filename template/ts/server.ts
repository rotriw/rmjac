// Auto-generated TypeScript API client
// Generated from: {{real_path}}

/**
 * {{handler_name}} - {{method}} {{route_path}}
 * @param params - Request parameters
 * @returns Promise with response data
 */
export async function {{function_name}}({{params_signature}}): Promise<{{return_type}}> {
  const url = `{{base_url}}{{route_url}}`
  const resp = await {{http_method}}<{{return_type}}>({{http_args}})
  return unwrap<{{return_type}}>(resp as any)
}