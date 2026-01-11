'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, Save, User, Mail, Phone, StickyNote, GraduationCap, Building2, Briefcase } from 'lucide-react'
import { Person } from '@/context/OrgDataContext'
import { showToast } from './Toast'

interface PersonDetailModalProps {
  isOpen: boolean
  onClose: () => void
  person: Person
  onSave: (updates: Partial<Person>) => void
  readOnly?: boolean
}

export default function PersonDetailModal({ isOpen, onClose, person, onSave, readOnly = false }: PersonDetailModalProps) {
  const [name, setName] = useState(person.name || '')
  const [title, setTitle] = useState(person.title || '')
  const [email, setEmail] = useState(person.email || '')
  const [phone, setPhone] = useState(person.phone || '')
  const [university, setUniversity] = useState(person.university || '')
  const [department, setDepartment] = useState(person.department || '')
  const [jobDescription, setJobDescription] = useState(person.jobDescription || '')
  const [notes, setNotes] = useState(person.notes || '')
  const [cvFileName, setCvFileName] = useState(person.cvFileName || '')
  const [cvData, setCvData] = useState(person.cvData || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // person prop'u değiştiğinde state'leri güncelle
  useEffect(() => {
    if (isOpen && person) {
      setName(person.name || '')
      setTitle(person.title || '')
      setEmail(person.email || '')
      setPhone(person.phone || '')
      setUniversity(person.university || '')
      setDepartment(person.department || '')
      setJobDescription(person.jobDescription || '')
      setNotes(person.notes || '')
      setCvFileName(person.cvFileName || '')
      setCvData(person.cvData || '')
    }
  }, [isOpen, person])

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        showToast('Dosya boyutu 5MB\'dan küçük olmalıdır.', 'error')
        return
      }
      
      const reader = new FileReader()
      reader.onload = () => {
        setCvData(reader.result as string)
        setCvFileName(file.name)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownloadCV = () => {
    if (cvData) {
      const link = document.createElement('a')
      link.href = cvData
      link.download = cvFileName || 'cv.pdf'
      link.click()
    }
  }

  const handleSave = () => {
    onSave({
      name,
      title,
      email,
      phone,
      university,
      department,
      jobDescription,
      notes,
      cvFileName,
      cvData,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Personel Detayı</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* İsim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" /> İsim Soyisim
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="Personel adı"
            />
          </div>

          {/* Ünvan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ünvan / Pozisyon
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="Örn: Yazılım Geliştirici"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" /> E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="ornek@email.com"
            />
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" /> Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="+90 5XX XXX XX XX"
            />
          </div>

          {/* Üniversite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <GraduationCap className="w-4 h-4 inline mr-1" /> Üniversite
            </label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="Örn: İstanbul Teknik Üniversitesi"
            />
          </div>

          {/* Bölüm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building2 className="w-4 h-4 inline mr-1" /> Bölüm
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="Örn: Bilgisayar Mühendisliği"
            />
          </div>

          {/* İş Tanımı / Görevler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-4 h-4 inline mr-1" /> İş Tanımı / Görevler
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={readOnly}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-none"
              placeholder="İş tanımı ve görevler..."
            />
          </div>

          {/* CV Yükleme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" /> CV / Özgeçmiş
            </label>
            <div className="flex items-center gap-2">
              {cvFileName ? (
                <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 truncate">{cvFileName}</span>
                  <button
                    onClick={handleDownloadCV}
                    className="ml-auto px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    İndir
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => { setCvFileName(''); setCvData(''); }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Sil
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={readOnly}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={readOnly}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>CV Yükle (PDF, DOC - Max 5MB)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <StickyNote className="w-4 h-4 inline mr-1" /> Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-none"
              placeholder="Personel hakkında notlar..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {readOnly ? 'Kapat' : 'İptal'}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Kaydet
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
