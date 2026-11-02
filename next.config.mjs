/** @type {import('next').NextConfig} */
const nextConfig = {
  // The end-to-end tests build into their own folder, so they never overwrite your dev build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
