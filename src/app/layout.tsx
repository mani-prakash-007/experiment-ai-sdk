import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Canvas AI ChatBot",
  description: "An AI-powered document management and chat application that helps users create, read, and edit documents with intelligent assistance.",
  keywords: ["AI chatbot", "document management", "artificial intelligence", "content generation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster duration={1000}/>
      </body>
    </html>
  );
}
