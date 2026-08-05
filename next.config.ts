import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright phải chạy như native module ở server, không được bundle
  serverExternalPackages: ["playwright-core"],

  // Gom mọi thứ cần thiết vào .next/standalone để đóng gói mang đi máy khác
  // mà không phải chạy npm install. Xem scripts/dong-goi.sh
  output: "standalone",

  // playwright-core nạp file động nên bộ dò phụ thuộc của Next có thể bỏ sót.
  // Ép đưa cả package vào bản standalone.
  outputFileTracingIncludes: {
    "/api/tvpl/stream": ["./node_modules/playwright-core/**/*"],
  },
};

export default nextConfig;
