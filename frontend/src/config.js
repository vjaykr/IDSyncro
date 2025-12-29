function resolveDefaultApiBaseUrl() {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  if (window.__IDSYNCRO_API_URL__) {
    return window.__IDSYNCRO_API_URL__;
  }

  const { protocol, hostname, host } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:9091`;
  }

  return `${protocol}//${host}`;
}

const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();
function resolveVerifyPortalBaseUrl() {
  if (process.env.REACT_APP_VERIFY_PORTAL_URL) {
    return process.env.REACT_APP_VERIFY_PORTAL_URL;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:9090';
  }

  if (window.__IDSYNCRO_VERIFY_URL__) {
    return window.__IDSYNCRO_VERIFY_URL__;
  }

  const { protocol, host, hostname } = window.location;
  if (hostname.startsWith('verify.')) {
    return `${protocol}//${host}`;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${host}`;
  }

  return 'https://verify.saralworkstechnologies.info';
}

const DEFAULT_VERIFY_PORTAL_BASE_URL = resolveVerifyPortalBaseUrl().replace(/\/$/, '');

export const API_BASE_URL = DEFAULT_API_BASE_URL;
export const VERIFY_PORTAL_BASE_URL = DEFAULT_VERIFY_PORTAL_BASE_URL;
export const UPLOADS_BASE_URL = `${API_BASE_URL}/uploads`;

export function buildApiUrl(path = '') {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

export function buildVerifyPortalUrl(path = '/verify') {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '/verify';
  const base = VERIFY_PORTAL_BASE_URL === '' ? resolveVerifyPortalBaseUrl() : VERIFY_PORTAL_BASE_URL;
  return `${base}${normalizedPath}`;
}
