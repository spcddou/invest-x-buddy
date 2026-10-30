// Applied before browser persistence, Neon writes, downloads and API responses.
// Request credentials are never included in prompts or workspace objects.
export function redactSecrets<T>(value:T):T{
 return JSON.parse(JSON.stringify(value).replace(/sk-[A-Za-z0-9_-]{8,}/g,'[REDACTED]')) as T;
}
