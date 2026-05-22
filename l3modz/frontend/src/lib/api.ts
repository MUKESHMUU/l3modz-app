export const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  if (envUrl && envUrl !== '') return envUrl.replace(/\/+$/, '');
  return '';
};

export const apiFetch = async (path: string, opts?: RequestInit) => {
  const base = getApiBase();
  const target = base ? `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}` : path;
  try {
    const res = await fetch(target, {
      credentials: opts?.credentials ?? 'include',
      ...opts,
    });
    return res;
  } catch (err) {
    console.error('[apiFetch] request failed', target, err);
    throw err;
  }
};
