export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function call<T>(path: string, body?: object, csrf?: string): Promise<T> {
  const response = await fetch('/api/' + path, body === undefined ? {} : {
    method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf ?? ''},
    body:JSON.stringify(body)
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new RequestError(response.status,json?.error ?? 'The service is temporarily unavailable.');
  }
  return response.json();
}

export function message(error: unknown) {
  return error instanceof RequestError ? error.message : 'Could not connect. Check your connection and try again.';
}
