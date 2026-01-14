'use client'

import { X } from 'lucide-react'

interface KureDetailModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function KureDetailModal({ isOpen, onClose }: KureDetailModalProps) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl flex items-center justify-between">
          <h2 className="text-2xl font-bold">KÜRE KOORDİNATÖRLÜĞÜ</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alt Birim Adı */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">ALT BİRİM ADI</h3>
            <p className="text-xl text-blue-600 font-semibold">KÜRE</p>
          </div>

          {/* Kişiler */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">KİŞİ</h3>
            <div className="bg-gray-50 rounded-lg p-4">
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
            <ul className="space-y-2">
              {responsibilities.map((responsibility, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span className="text-gray-700 text-base">{responsibility}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
