/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiFetch } from './api-emulator';

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('fms_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await apiFetch(endpoint, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    // Handle auth errors (could trigger logout)
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Something went wrong');
  }

  return response.json();
}

export const api = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, data: any) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: (endpoint: string, data: any) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};
