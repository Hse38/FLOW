'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TurkeyMapModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TurkeyMapModal({ isOpen, onClose }: TurkeyMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    // SVG haritasını yükle ve işle
    const container = mapContainerRef.current
    const svgElement = container.querySelector('#svg-turkiye-haritasi') as SVGSVGElement
    const infoDiv = infoRef.current

    if (!svgElement || !infoDiv) return

    // Mouse over event
    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as SVGPathElement
      if (target.tagName === 'path') {
        const parent = target.parentNode as SVGElement
        const ilAdi = parent.getAttribute('data-iladi')
        if (ilAdi && infoDiv) {
          infoDiv.innerHTML = `<div>${ilAdi}</div>`
          infoDiv.style.display = 'block'
        }
      }
    }

    // Mouse move event
    const handleMouseMove = (event: MouseEvent) => {
      if (infoDiv && infoDiv.style.display === 'block') {
        infoDiv.style.top = event.pageY + 25 + 'px'
        infoDiv.style.left = event.pageX + 'px'
      }
    }

    // Mouse out event
    const handleMouseOut = () => {
      if (infoDiv) {
        infoDiv.innerHTML = ''
        infoDiv.style.display = 'none'
      }
    }

    // Click event
    const handleClick = (event: MouseEvent) => {
      const target = event.target as SVGPathElement
      if (target.tagName === 'path') {
        const parent = target.parentNode as SVGElement
        const ilAdi = parent.getAttribute('data-iladi')
        
        if (ilAdi) {
          setSelectedProvince(ilAdi)
          // Şehir seçildiğinde highlight yap
          // Tüm path'leri sıfırla (bölge renklerine dön)
          svgElement.querySelectorAll('path').forEach(path => {
            const bolge = (path.parentNode as SVGElement)?.parentNode as SVGElement
            const bolgeNum = bolge?.getAttribute('id')?.replace('bolge-', '')
            const bolgeRenkleri: Record<string, string> = {
              '1': '#87cdde',
              '2': '#ac93a7',
              '3': '#ffb380',
              '4': '#cccccc',
              '5': '#decd87',
              '6': '#de8787',
              '7': '#aade87'
            }
            if (bolgeNum && bolgeRenkleri[bolgeNum]) {
              path.setAttribute('fill', bolgeRenkleri[bolgeNum])
            }
          })
          // Seçili path'i highlight yap
          target.setAttribute('fill', '#3b82f6')
        }
      }
    }

    svgElement.addEventListener('mouseover', handleMouseOver)
    svgElement.addEventListener('mousemove', handleMouseMove)
    svgElement.addEventListener('mouseout', handleMouseOut)
    svgElement.addEventListener('click', handleClick)

    return () => {
      svgElement.removeEventListener('mouseover', handleMouseOver)
      svgElement.removeEventListener('mousemove', handleMouseMove)
      svgElement.removeEventListener('mouseout', handleMouseOut)
      svgElement.removeEventListener('click', handleClick)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between border-b border-green-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Toplumsal Çalışmalar Koordinatörlüğü</h2>
                  <p className="text-green-100 text-sm mt-1">Türkiye İl Temsilcileri Haritası</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Map Container */}
            <div 
              ref={mapContainerRef}
              className="flex-1 overflow-auto bg-gray-50 p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* İl İsimleri Tooltip */}
              <div ref={infoRef} className="il-isimleri fixed pointer-events-none z-10" style={{ display: 'none' }}></div>

              {/* SVG Haritası */}
              <div className="svg-turkiye-haritasi max-w-7xl mx-auto">
                <svg 
                  version="1.1" 
                  id="svg-turkiye-haritasi" 
                  xmlns="http://www.w3.org/2000/svg" 
                  xmlnsXlink="http://www.w3.org/1999/xlink" 
                  viewBox="0 0 1052.3622 744.09448" 
                  xmlSpace="preserve"
                  className="w-full h-auto"
                >
                  {/* Marmara Bölgesi */}
                  <g id="bolge-1" data-bolge="Marmara">
                    <g id="balikesir" data-plakakodu="10" data-alankodu="266" data-iladi="Balıkesir">
                      <path d="M104.629,97.282l0.312,0.156c0,0,1.312,0.699,2.688,0.813c0.907,0.076,1.528,0.579,1.843,1.032 c0.316,0.453,0.375,0.906,0.375,0.906l0.094,0.5l-0.5,0.062l-3.5,0.529c-0.002,0.001-0.029-0.001-0.031,0 c-0.142,0.086-0.645,0.424-1.344,0.843c-0.791,0.475-1.58,0.96-1.907,1.124c-0.22,0.11-0.432,0.072-0.594,0.031 s-0.296-0.109-0.438-0.188c-0.284-0.156-0.578-0.347-0.844-0.562c-0.531-0.431-1-0.907-1-0.907l-0.125-0.125v-0.188l-0.123-2.781 l-0.031-0.625l0.594,0.094l3.094,0.471l1.189-0.999L104.629,97.282z"/>
                      <path d="M108.435,108.127l-0.781,0.875c0,0-0.058,0.094-0.094,0.188c-0.012,0.033-0.03,0.051-0.031,0.062 c0.128,0.114,0.618,0.436,1.031,0.72c0.206,0.141,0.403,0.281,0.562,0.406c0.08,0.063,0.12,0.118,0.188,0.188 c0.034,0.035,0.087,0.067,0.125,0.125c0.02,0.03,0.042,0.105,0.062,0.156c0.006,0.009,0.025,0.019,0.062,0.062 c0.075,0.088,0.189,0.212,0.312,0.344c0.123,0.132,0.26,0.298,0.375,0.438c0.115,0.14,0.211,0.223,0.281,0.469 c0.023,0.081,0.22,0.564,0.374,0.969c0.155,0.405,0.281,0.781,0.281,0.781l0.094,0.219l-0.125,0.188c0,0-0.003,0.066,0,0.125 c0.003,0.058-0.052,0.098,0.219,0.219c0.758,0.337,2.999,1.19,2.999,1.19l0.219,0.094l0.094,0.219l0.843,2.562l0.094,0.281 l-0.219,0.219l-0.938,0.905l-0.312-0.344l0.156,0.375c-0.646,0.299-1.601,0.68-2.532,1.124s-1.812,0.973-2.282,1.53l-0.188,0.25 l-0.312-0.094l-7.374-1.754l-5.562,0.747l-0.031-0.219l-1.376,2.718l-0.062,0.125l-0.094,0.094l-3.97,2.56l-0.094,0.062 l-2.501,2.53l0.654,2.906l2.093,2.563l0.062,0.094l0.031,0.094l1.122,4.689l0.031,0.031v0.062l0.123,3.906l0.124,1.719v0.031 l0.718,2.031l0.062,0.125l-0.031,0.156l-0.907,3.283v0.031v0.031l-1.252,3.28l-0.062,0.125l-0.094,0.094l-3.032,2.373 l-0.062,0.031l-0.031,0.031l-4.157,2.154h-0.064l-0.031,0.031l-3.407,1.123l-0.062,0.031h-0.062l-3,0.248h-0.219l-0.125-0.094 l-2.53-1.907l-2.405-1.751l-3.437-1.471h-0.031l-1.905-0.97l-1.595-0.374l-2.125,0.218l-2.439,1.811l-0.031,0.031l-0.062,0.031 l-1.782,0.75l-0.094,0.062H57.82l-3.469-0.002h-0.062l-4.625,0.591l-0.751,1.406v0.031l-1.658,2.78l-1.095,1.718l-0.157,2 l2.531-0.561l0.062-0.031h0.031l5.188-0.153h0.156l0.125,0.062l1.405,0.939l3.375-0.81l0.094-0.031h0.062l2.344,0.189l0.25,0.031 l0.125,0.219l1.437,2.501l0.125,0.25l-0.125,0.25l-1.783,3.374l-0.062,0.156l-0.156,0.062l-2.751,1.467l-0.19,2.938l-0.031,0.438 l-0.438,0.031l-3.625,0.154l-0.001,1.844v0.281l-0.281,0.156l-1.939,1.061l-2.407,1.374l-0.031,0.031l-0.062,0.031l-2.063,1.905 l-0.156,0.125h-0.188l-1.375-0.001l-0.531,0.594l2.281,0.001h0.125l0.125,0.094l1.438,0.876l0.25,0.156l-0.031,0.312l-0.127,3.188 l1.281,0.376l3.095-1.467l1.907-1.749l0.031-0.062l0.093-0.032l3.282-1.529l0.094-0.031h0.094l2-0.124l2.157-1.437l2.907-1.998 l0.062-0.062l0.094-0.031l3.188-0.842l0.094-0.031l1.656-0.843l0.219-0.125l0.219,0.125l1.812,0.845l0.094,0.031l3.812,0.846 h0.031v0.031l4.937,1.628l1.189-1.937l0.156-0.219h0.281l3.906,0.002h0.125l0.094,0.031l1.656,0.907l0.062,0.031l0.031,0.031 l3.154,3.033l2.03,1.001l5.97,0.003h0.156l0.125,0.094l1.28,0.939l3.688,0.252h0.094l3.688-0.498l0.531-0.094l0.031,0.531 l0.372,4.781l1.437,2.313l0.031,0.031v0.031l1.31,2.782l1.968,1.595l2.374,1.876l0.062,0.062l0.062,0.062l2.092,3.126l0.031,0.031 l2.093,2.563l4.312,0.002c0,0,0.593-0.146,1.25-0.374c0.657-0.229,1.412-0.598,1.562-0.749c0.305-0.305,0.69-0.377,1.094-0.437 c0.404-0.061,0.847-0.071,1.281-0.061c0.434,0.009,0.843,0.037,1.188,0.063c0.345,0.025,0.655,0.031,0.719,0.031 c-0.02,0,0.158-0.018,0.375-0.094c0.217-0.076,0.504-0.174,0.75-0.281c0.491-0.215,0.906-0.438,0.906-0.438l0.125-0.062h0.094 c0,0,5.804,0.003,6.688,0.004c0.251,0,1.299-0.25,2.156-0.499c0.857-0.249,1.625-0.468,1.625-0.468l0.031-0.031h0.031l2.406-0.437 l0.095-1.5l-0.969-0.876l-0.094-0.062l-0.031-0.094l-0.874-1.875l-0.062-0.125v-0.125l0.126-2.281l0.031-0.25l0.219-0.156 l1.5-0.874h0.032l1.125-0.624l0.094-0.062h0.094l4.469-0.498l3.532-1.092l3.407-2.06l1.032-2.311l0.378-5.312v-0.062l0.031-0.031 l0.501-1.781l0.031-0.125l0.094-0.094l1.939-1.937l1.784-4.811l-0.875-0.594l-3.844-0.377l-2.345,1.093l-0.281,0.094l-0.219-0.156 l-2.53-1.782l-0.062-0.031l-0.062-0.094l-2.029-3.032l-0.031-0.062l-0.031-0.094l-0.717-3.188l-0.031-0.062v-0.031l-1.061-2.501 l-2.313,0.968l-0.094,0.031h-0.125l-6.688-0.254l-0.219-0.031l-0.125-0.156l-1.655-1.876l-0.031-0.062l-0.031-0.031l-1.904-3.376 l-6.81-2.973l-0.125-0.062l-0.094-0.125l-1.998-2.907l-0.031-0.031v-0.031l-1.779-3.407l-0.062-0.094v-0.156l0.127-3.938 l-1.06-3.22l-2.123-3.532l-0.031-0.062l-0.031-0.062l-1.123-3.782l-0.036-0.065v-0.062l-0.248-4.344v-0.062l-0.623-2.844 l-0.062-0.25l0.188-0.219l1.845-1.811l0.062-0.062l2.658-3.999l-1.094-0.595l-2.719-0.033l-1.562,0.874l-0.125,0.062h-0.125 l-4.625-0.003h-0.094l-0.094-0.062l-1.438-0.563l-0.188-0.062l-0.062-0.188l-1.187-2.376l-0.188-0.375l0.375-0.25l1.657-1.155 l1.344-0.905l0.031-0.031l2.313-1.155l0.062-0.031l1.312-0.905l-0.031-0.156l-2.312-0.876v-0.031c0,0-0.571-0.226-1.156-0.47 c-0.293-0.121-0.576-0.256-0.812-0.344c-0.118-0.044-0.241-0.072-0.312-0.094c-0.036-0.011-0.08-0.026-0.094-0.031 c-0.256-0.009-0.528-0.072-0.844-0.125c-0.34-0.057-0.656-0.094-0.656-0.094h-0.031l-0.031-0.031l-2.594-0.907h-0.03l-2.812-0.033 l-0.156-0.031l-0.125-0.062c0,0-0.24-0.174-0.5-0.344c-0.13-0.085-0.272-0.194-0.375-0.25c-0.051-0.028-0.104-0.023-0.125-0.031 C109.18,108.127,108.667,108.127,108.435,108.127z" fill="#87cdde"/>
                    </g>
                    {/* Diğer iller için kısa path tanımlamaları - tam SVG kullanıcı tarafından sağlanacak */}
                  </g>
                  
                  {/* İç Anadolu Bölgesi */}
                  <g id="bolge-2" data-bolge="Iç Anadolu">
                    {/* İç Anadolu illeri */}
                  </g>
                  
                  {/* Ege Bölgesi */}
                  <g id="bolge-3" data-bolge="Ege">
                    {/* Ege illeri */}
                  </g>
                  
                  {/* Akdeniz Bölgesi */}
                  <g id="bolge-4" data-bolge="Akdeniz">
                    {/* Akdeniz illeri */}
                  </g>
                  
                  {/* Karadeniz Bölgesi */}
                  <g id="bolge-5" data-bolge="Karadeniz">
                    {/* Karadeniz illeri */}
                  </g>
                  
                  {/* Güneydoğu Anadolu Bölgesi */}
                  <g id="bolge-6" data-bolge="Güneydoğu Anadolu">
                    {/* Güneydoğu Anadolu illeri */}
                  </g>
                  
                  {/* Doğu Anadolu Bölgesi */}
                  <g id="bolge-7" data-bolge="Doğu Anadolu">
                    {/* Doğu Anadolu illeri */}
                  </g>

                  <style>{`
                    #svg-turkiye-haritasi path {
                      cursor: pointer;
                      transition: fill 0.2s ease;
                    }
                    #svg-turkiye-haritasi path:hover {
                      fill: #3b82f6 !important;
                      opacity: 0.8;
                    }
                    #bolge-1 g path { fill: #87cdde; }
                    #bolge-2 g path { fill: #ac93a7; }
                    #bolge-3 g path { fill: #ffb380; }
                    #bolge-4 g path { fill: #cccccc; }
                    #bolge-5 g path { fill: #decd87; }
                    #bolge-6 g path { fill: #de8787; }
                    #bolge-7 g path { fill: #aade87; }
                    .il-isimleri div {
                      font-family: 'Open Sans', sans-serif;
                      display: inline-block;
                      background: #222;
                      color: #fff;
                      padding: 8px 16px;
                      border-radius: 4px;
                      font-size: 14px;
                      font-weight: 600;
                    }
                  `}</style>
                </svg>
              </div>

              {/* Seçili İl Bilgisi */}
              {selectedProvince && (
                <div className="mt-4 max-w-7xl mx-auto">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <p className="text-blue-800 font-semibold">
                      Seçili İl: <span className="text-lg">{selectedProvince}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
