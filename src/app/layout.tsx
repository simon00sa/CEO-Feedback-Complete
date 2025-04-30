
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/components/AuthProvider";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { Toaster } from "@/components/ui/sonner"; // Import Toaster for notifications

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Speak Up - Anonymous Feedback Platform",
  description: "An AI-powered anonymous feedback platform for honest communication with leadership",
}

// Create a client component to use the hook
function IdleTimeoutHandler({ children }: { children: React.ReactNode }) {
  useIdleTimeout(10 * 60 * 1000); // Use 10 minutes timeout
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark"> {/* Assuming dark mode is default */} 
      <body className={inter.className}>
        <AuthProvider> 
          <IdleTimeoutHandler> {/* Wrap children with the hook handler */} 
            {children}
          </IdleTimeoutHandler>
          <Toaster /> {/* Add Toaster for notifications */} 
        </AuthProvider>
      </body>
    </html>
  )
}

