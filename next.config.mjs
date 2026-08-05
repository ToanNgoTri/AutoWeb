/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright phải chạy như native module ở server, không được bundle
  serverExternalPackages: ["playwright-core"],

  // Gom mọi thứ cần thiết vào .next/standalone để đóng gói mang đi máy khác
  // mà không phải chạy npm install. Xem scripts/dong-goi.sh
  output: "standalone",

  // playwright-core nạp file động (browsers.json, lib/…) nên bộ dò phụ thuộc
  // của Next copy thiếu. Ép đưa CẢ package vào bản standalone.
  // Dùng khoá "/*" cho mọi route thay vì tên một route cụ thể — đổi tên route
  // mà quên sửa chỗ này là gói ra sẽ chạy được ở dev nhưng chết khi đóng gói.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/playwright-core/**/*"],
  },
};

export default nextConfig;
