// Fix for Cache constructor error in Netlify
import '@/lib/cache-fix';

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/components/AuthProvider";
import IdleTimeoutHandler from "@/components/IdleTimeoutHandler"; // Import from separate file
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Speak Up - Anonymous Feedback Platform",
  description: "An AI-powered anonymous feedback platform for honest communication with leadership",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider> 
          <IdleTimeoutHandler>
            {children}
          </IdleTimeoutHandler>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
