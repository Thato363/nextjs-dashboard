import '@/app/ui/global.css';
import { inter } from "@/app/ui/fonts";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareFlow Clinic",
  description: "Clinic workspace for patient records, scheduling, and care coordination.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
