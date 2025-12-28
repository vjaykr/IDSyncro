const DEFAULT_API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.__IDSYNCRO_API_URL__) || 'https://idsyncro.saralworkstechnologies.info';

export const API_BASE_URL = DEFAULT_API_BASE_URL;
export const UPLOADS_BASE_URL = `${API_BASE_URL}/uploads`;

export function buildApiUrl(path = '') {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}
