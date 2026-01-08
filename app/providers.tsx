'use client'

import { ReactNode } from 'react'
import { OrgDataProvider } from '@/context/OrgDataContext'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <OrgDataProvider>
      {children}
    </OrgDataProvider>
  )
}
