import { Toaster } from "@/components/ui/sonner";
import { ChatSidebar } from "@/components/ChatSidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <div className="h-screen w-screen overflow-hidden fixed">
        <div className="flex h-full w-full">
          <ChatSidebar />
          <main className="flex-1 overflow-auto min-w-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-all duration-300">
            {children}
          </main>
        </div>
        <Toaster duration={1000}/>
      </div>
  );
}
