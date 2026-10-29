import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['mysql2', 'exceljs'],
};

export default nextConfig;
