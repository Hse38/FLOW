'use client'


import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Target, ListChecks, Users, Home } from 'lucide-react'
import orgData from '@/data/org.json'

// Type definitions
interface Coordinator {
  id: string
  title: string
  description: string
  responsibilities?: string[]
  position: { x: number; y: number }
  parent: string
  hasDetailPage?: boolean
  coordinator?: { name: string; title: string }
  deputies?: { id: string; name: string; title: string; responsibilities?: string[] }[]
  subUnits?: { id: string; title: string; people?: { name: string }[]; responsibilities?: string[] }[]
}

interface MainCoordinator {
  id: string
  title: string
  description: string
  type: string
  position: { x: number; y: number }
  parent: string | null
}

export default function UnitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  // Find coordinator or mainCoordinator
  const coordinator = (orgData.coordinators as Coordinator[]).find((c) => c.id === slug)
  const mainCoordinator = (orgData.mainCoordinators as MainCoordinator[]).find((m) => m.id === slug)
  const item = coordinator || mainCoordinator

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Birim Bulunamadı</h1>
          <p className="text-gray-600 mb-6">Aradığınız birim mevcut değil.</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    )
  }

  // Check if this is Kurumsal İletişim with detailed structure
  const hasDetailedStructure = 'hasDetailPage' in item && (item as Coordinator).hasDetailPage

  if (hasDetailedStructure && coordinator) {
    return <KurumsalIletisimPage item={coordinator} router={router} />
  }

  // Get responsibilities if available
  const responsibilities = 'responsibilities' in item ? item.responsibilities : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Birim Detayları</h1>
              <p className="text-sm text-gray-600">Kurumsal yapı hakkında detaylı bilgi</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-2xl p-8"
          >
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Target className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-3">{item.title}</h2>
                <p className="text-emerald-50 text-lg leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Responsibilities */}
          {responsibilities && responsibilities.length > 0 && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <ListChecks className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Sorumluluklar</h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {responsibilities.map((responsibility: string, index: number) => (
                  <motion.li
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                    className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all"
                  >
                    <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-700 leading-relaxed">{responsibility}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Back Button */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-center pt-4"
          >
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 rounded-xl shadow-lg hover:shadow-xl border border-gray-200 transition-all font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Organizasyon Şemasına Dön
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Kurumsal İletişim özel sayfası
function KurumsalIletisimPage({ item, router }: { item: any; router: any }) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #e8f4fc 0%, #d4e8f5 100%)' }}>
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
              <p className="text-sm text-gray-600">Detaylı organizasyon yapısı</p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Koordinatör */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="bg-white border-2 border-[#3b82a0] rounded-lg px-8 py-4 shadow-lg text-center">
            <h2 className="text-xl font-bold text-[#3b82a0]">{item.title}</h2>
            <p className="text-[#3b82a0] font-semibold">{item.coordinator?.name}</p>
          </div>
          
          {/* Connector line */}
          <div className="w-0.5 h-8 bg-[#3b82a0]"></div>
          
          {/* Sorumluluklar kutusu */}
          <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-md max-w-xl">
            <ul className="text-sm text-gray-700 space-y-1">
              {item.responsibilities?.map((resp: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#3b82a0]">•</span>
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Connector line */}
          <div className="w-0.5 h-8 bg-[#3b82a0]"></div>
        </motion.div>

        {/* Koordinatör Yardımcıları */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center gap-16 mb-8 flex-wrap"
        >
          {item.deputies?.map((deputy: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="bg-white border-2 border-[#3b82a0] rounded-full px-6 py-3 shadow-lg text-center min-w-[220px]">
                <p className="text-sm text-[#3b82a0] font-medium">Koordinatör Yardımcısı</p>
                <p className="text-[#3b82a0] font-bold">{deputy.name}</p>
              </div>
              
              {/* Connector line */}
              <div className="w-0.5 h-6 bg-gray-400"></div>
              
              {/* Yardımcı sorumlulukları */}
              <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-sm max-w-xs">
                <ul className="text-xs text-gray-600 space-y-1">
                  {deputy.responsibilities?.map((resp: string, rIdx: number) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Alt Birimler */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {item.subUnits?.map((subUnit: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + idx * 0.05 }}
                className="flex flex-col"
              >
                {/* Birim başlığı */}
                <div className="bg-white border-l-4 border-[#3b82a0] rounded-lg px-4 py-3 shadow-md mb-3">
                  <h3 className="font-bold text-[#3b82a0] text-center">{subUnit.title}</h3>
                </div>
                
                {/* Çalışanlar */}
                <div className="mb-3">
                  <ul className="text-sm space-y-1">
                    {subUnit.people?.map((person: any, pIdx: number) => (
                      <li key={pIdx} className="flex items-center gap-2">
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-800">{person.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Sorumluluklar */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex-1">
                  <ul className="text-xs text-gray-600 space-y-1">
                    {subUnit.responsibilities?.map((resp: string, rIdx: number) => (
                      <li key={rIdx} className="flex items-start gap-1">
                        <span className="text-[#3b82a0] mt-0.5">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center pt-12"
        >
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 rounded-xl shadow-lg hover:shadow-xl border border-gray-200 transition-all font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Organizasyon Şemasına Dön
          </button>
        </motion.div>
      </div>
    </div>
  )
}
