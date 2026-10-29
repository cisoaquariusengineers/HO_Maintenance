// Shared by proxy.ts (page access) and auth.ts (API access).
export const ACCESS = {
  supervisor: { envKey: 'SUPERVISOR_KEY', cookie: 'hk_sup', path: '/supervisor' },
  admin: { envKey: 'ADMIN_KEY', cookie: 'hk_adm', path: '/admin' },
} as const;
