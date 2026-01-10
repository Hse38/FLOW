'use client'

import { ReactNode } from 'react'
import { OrgDataProvider } from '@/context/OrgDataContext'
import ToastContainer from '@/components/Toast'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <OrgDataProvider>
      {children}
      <ToastContainer />
    </OrgDataProvider>
  )
}
