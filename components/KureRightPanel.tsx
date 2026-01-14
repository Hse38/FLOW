'use client'

import { X } from 'lucide-react'

interface KureRightPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function KureRightPanel({ isOpen, onClose }: KureRightPanelProps) {
  if (!isOpen) return null

  const personnel = [
    'Duygu Şahinler',
    'Ayşe Aslıhan Yoran',
    'Meryem Şentürk Çoban',
    'Burak Enes',
    'Onur Çolak',
    'Yusuf Bilal Akkaya',
    'Nazlıcan Kemer Kaya',
    'Nurten Yalçın',
    'Hamza Aktay',
    'Burcu Sandıkçı',
    'Zozan Demirci',
    'Sadullah Bora Yıldırım'
  ]

  const responsibilities = [
    'İçerik üretimi ve redaksiyon',
    'Bilgi doğrulama ve kaynak denetimi',
    'Yapay zeka içerik kontrolü',
    'SEO ve yayın standartlarının uygulanması'
  ]

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between border-b border-blue-500">
        <div>
          <h2 className="text-2xl font-bold">KÜRE KOORDİNATÖRLÜĞÜ</h2>
          <p className="text-sm text-blue-100 mt-1">Alt Birim Detayları</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Alt Birim Adı */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">ALT BİRİM ADI</h3>
          <p className="text-xl text-blue-600 font-bold">KÜRE</p>
        </div>

        {/* Kişiler */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">KİŞİ</h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {personnel.map((person, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium"
                >
                  {person}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Görevler */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">GÖREVLER</h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <ul className="space-y-3">
              {responsibilities.map((responsibility, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1 text-lg">•</span>
                  <span className="text-gray-700 text-base flex-1">{responsibility}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Kapat
        </button>
      </div>
    </div>
  )
}
