'use client'
import Sidebar from '@/components/shared/Sidebar'
import MobileNav from '@/components/shared/MobileNav'
import React from 'react'
import { Toaster } from '@/components/ui/toaster'


const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main id="root" className="root">
      <Sidebar />
      <MobileNav></MobileNav>
      
        <div className="root-container">
            <div className="wrapper">
            {children}
            </div>
        </div>

        <Toaster />
    </main>
  )
}

export default Layout