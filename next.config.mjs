/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.37"],
  images: {
    // Cloudinary resizes/compresses on its CDN — see src/lib/imageLoader.js
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.js",
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "oros-backend-hl4n.onrender.com" },
    ],
  },
};

export default nextConfig;
