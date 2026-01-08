'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Network } from 'lucide-react'

// Dynamically import OrgCanvas to avoid SSR issues with React Flow
const OrgCanvas = dynamic(() => import('@/components/OrgCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600 font-medium">Organizasyon şeması yükleniyor...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* Header Overlay */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-2.5 rounded-xl shadow-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Organizasyon Şeması
                </h1>
                <p className="text-sm text-gray-600">İnteraktif Kurumsal Yapı Haritası</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">İpucu:</span> Fareyi kullanarak yakınlaştırın ve gezinin
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Canvas with top padding for header */}
      <div className="w-full h-screen pt-20">
        <OrgCanvas />
      </div>

      {/* Legend Overlay */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg p-4 max-w-xs"
      >
        <h3 className="text-sm font-bold text-gray-900 mb-3">Rehber</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-600 to-indigo-800"></div>
            <span className="text-xs text-gray-700">Yönetim</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-700"></div>
            <span className="text-xs text-gray-700">Koordinatörlük</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-emerald-600"></div>
            <span className="text-xs text-gray-700">Birim</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-400 to-purple-600"></div>
            <span className="text-xs text-gray-700">Kişi</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Bir düğüme tıklayarak detaylı bilgi görüntüleyin
          </p>
        </div>
      </motion.div>

      {/* Controls Helper (Mobile) */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        className="md:hidden absolute bottom-6 right-6 z-10 bg-indigo-600 text-white rounded-full px-4 py-2 shadow-lg text-xs font-medium"
      >
        2 parmakla kaydırın
      </motion.div>
    </main>
  )
}
