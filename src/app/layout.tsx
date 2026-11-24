import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gia Phả Gia Đình — Phả Hệ & Suy Luận Xưng Hô Nam Bộ",
  description:
    "Nền tảng phả hệ gia đình kết nối đa cành nhánh, trực quan hóa mạng lưới huyết thống và tính toán xưng hô chuẩn phong tục Nam Bộ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
