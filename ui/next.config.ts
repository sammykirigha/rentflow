import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'eduaiapp-black.vercel.app', pathname: '/**' },
      { protocol: 'https', hostname: 'eduaiapp.onrender.com', pathname: '/**' },
      { protocol: 'https', hostname: 'octopus-app-fnmoo.ondigitalocean.app', pathname: '/**' },
      { protocol: 'https', hostname: 'ai.edutized.com', pathname: '/**' },
    ]
  }
  /* config options here */
};

export default nextConfig;
