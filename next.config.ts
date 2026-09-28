import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Gallery, gift images and the couple's OG image all live on Cloudinary.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    // Cloudinary serves AVIF/WebP; keep the default quality list small.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
