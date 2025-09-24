import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ChatSidebar } from "@/components/ChatSidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <div className="h-screen w-screen overflow-hidden">
        <div className="flex h-full w-full">
          <ChatSidebar />
          <main className="flex-1 overflow-auto min-w-0">
            {children}
          </main>
        </div>
        <Toaster duration={1000}/>
      </div>
  );
}
