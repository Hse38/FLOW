'use client'

import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, Menu, X, FileText, FolderOpen, Edit2, Eye, Trash2, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { showToast } from '@/components/Toast'
import { useOrgData } from '@/context/OrgDataContext'

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


// Saved project interface
interface SavedProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function Home() {
  // OrgData context
  const { syncLocalToFirebase, loadData, syncInitialDataToFirebase, addKureToFirebase, addKureCoordinatorToFirebase } = useOrgData()
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [currentProject, setCurrentProject] = useState<SavedProject | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')


  // Presentation mode state
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  
  // Client-side mount state (for hydration fix)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Küre Koordinatörlüğü coordinator'ını otomatik olarak Firebase'e ekle (her zaman kontrol et)
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      // Sadece production'da (localhost değilse)
      const hostname = window.location.hostname
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
      
      if (!isLocalhost) {
        // 3 saniye bekle (sayfa ve Firebase yüklensin)
        setTimeout(async () => {
          try {
            console.log('🔍 Küre Koordinatörlüğü coordinator\'ı Firebase\'de kontrol ediliyor...')
            const result = await addKureCoordinatorToFirebase()
            if (result?.success) {
              console.log('✅✅✅ Küre Koordinatörlüğü coordinator\'ı Firebase\'e eklendi/güncellendi! ✅✅✅')
            } else {
              console.warn('⚠️ Küre coordinator ekleme sonucu:', result)
            }
          } catch (error) {
            console.error('❌ Küre coordinator ekleme hatası:', error)
            // Hata olsa bile tekrar deneme (kullanıcı manuel butona basabilir)
          }
        }, 3000)
      }
    }
  }, [isMounted, addKureCoordinatorToFirebase])
  
  // Sync to Firebase handler
  const handleSyncToFirebase = async () => {
    try {
      showToast('Firebase\'e yükleniyor...', 'info', 3000)
      const result = await syncLocalToFirebase()
      if (result?.success) {
        showToast(
          `✅ Veriler Firebase'e yüklendi! Şimdi push yapın: git push origin main`, 
          'success',
          10000
        )
        console.log('')
        console.log('═══════════════════════════════════════════════════════════')
        console.log('📝 CANLIDA GÖRMEK İÇİN PUSH YAPIN:')
        console.log('═══════════════════════════════════════════════════════════')
        console.log('')
        console.log('1️⃣  git add .')
        console.log('2️⃣  git commit -m "Lokaldeki verileri Firebase\'e yükle"')
        console.log('3️⃣  git push origin main')
        console.log('')
        console.log('✅ Vercel otomatik deploy edecek (1-2 dakika)')
        console.log('✅ Deploy sonrası canlıda Firebase\'den veriler yüklenecek')
        console.log('')
        console.log('💡 Firebase Console\'dan kontrol edebilirsiniz:')
        console.log('   https://console.firebase.google.com/project/t3-vakfi-org/database')
        console.log('')
        console.log('═══════════════════════════════════════════════════════════')
      }
    } catch (error) {
      console.error('Firebase sync hatası:', error)
      showToast('Firebase\'e yükleme hatası. Console\'u kontrol edin.', 'error', 5000)
    }
  }

  // Load saved projects on mount
  useEffect(() => {
    const saved = localStorage.getItem('orgProjects')
    if (saved) {
      try {
        const projects = JSON.parse(saved)
        setSavedProjects(projects)
        // Load last active project
        const lastProjectId = localStorage.getItem('activeProjectId')
        if (lastProjectId && lastProjectId !== 'main') {
          const lastProject = projects.find((p: SavedProject) => p.id === lastProjectId)
          if (lastProject) {
            setCurrentProject(lastProject)
          }
        }
      } catch (e) {
        console.error('Failed to load projects:', e)
      }
    }
  }, [])

  // Load main (default) schema
  const loadMainSchema = () => {
    setCurrentProject(null)
    localStorage.setItem('activeProjectId', 'main')
    localStorage.removeItem('activeProjectId')
    window.location.reload()
  }

  // Create new blank project
  const createNewProject = () => {
    const newProject: SavedProject = {
      id: Date.now().toString(),
      name: 'Yeni Şema',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updatedProjects = [...savedProjects, newProject]
    setSavedProjects(updatedProjects)
    setCurrentProject(newProject)
    localStorage.setItem('orgProjects', JSON.stringify(updatedProjects))
    localStorage.setItem('activeProjectId', newProject.id)

    // Clear current org data for blank canvas
    localStorage.setItem(`orgData_${newProject.id}`, JSON.stringify({
      management: [],
      executives: [],
      mainCoordinators: [],
      coordinators: []
    }))

    // Reload to apply blank canvas
    window.location.reload()
  }

  // Load existing project
  const loadProject = (project: SavedProject) => {
    setCurrentProject(project)
    localStorage.setItem('activeProjectId', project.id)
    window.location.reload()
  }

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    projectId: string
  } | null>(null)

  // Delete project
  const deleteProject = (projectId: string) => {
    setConfirmationModal({ isOpen: true, projectId })
  }

  const handleConfirmDelete = () => {
    if (!confirmationModal) return
    const { projectId } = confirmationModal
    const updatedProjects = savedProjects.filter(p => p.id !== projectId)
    setSavedProjects(updatedProjects)
    localStorage.setItem('orgProjects', JSON.stringify(updatedProjects))
    localStorage.removeItem(`orgData_${projectId}`)

    if (currentProject?.id === projectId) {
      setCurrentProject(null)
      localStorage.removeItem('activeProjectId')
    }
    setConfirmationModal(null)
  }

  // Rename project
  const renameProject = (projectId: string, newName: string) => {
    const updatedProjects = savedProjects.map(p =>
      p.id === projectId ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
    )
    setSavedProjects(updatedProjects)
    localStorage.setItem('orgProjects', JSON.stringify(updatedProjects))

    if (currentProject?.id === projectId) {
      setCurrentProject({ ...currentProject, name: newName })
    }
    setEditingProjectId(null)
  }


  return (
    <main className="relative w-full h-screen overflow-hidden flex">
      {/* Left Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-gray-900 text-white z-50 flex flex-col shadow-2xl"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-6 h-6 text-indigo-400" />
                  <span className="font-bold text-lg">Şema Yöneticisi</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* New Project Button */}
              <div className="p-4">
                <button
                  onClick={createNewProject}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Şema Oluştur
                </button>
              </div>

              {/* Ana Şema - Always visible */}
              <div className="px-4 pb-2">
                <button
                  onClick={loadMainSchema}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${!currentProject
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <div className="text-left">
                    <span className="font-semibold">Ana Şema</span>
                    <p className="text-xs opacity-75">T3 Vakfı Organizasyonu</p>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className="px-4">
                <div className="border-t border-gray-700"></div>
              </div>

              {/* Projects List */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Önceki Çalışmalarınız
                </h3>

                {savedProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Henüz kayıtlı şema yok</p>
                    <p className="text-xs mt-1">Yeni şema oluşturarak başlayın</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`group relative rounded-xl transition-colors ${currentProject?.id === project.id
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'hover:bg-gray-800 border border-transparent'
                          }`}
                      >
                        {editingProjectId === project.id ? (
                          <div className="p-3">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => renameProject(project.id, editingName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameProject(project.id, editingName)
                                if (e.key === 'Escape') setEditingProjectId(null)
                              }}
                              autoFocus
                              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => loadProject(project)}
                            className="w-full p-3 text-left flex items-start gap-3"
                          >
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{project.name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(project.updatedAt).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          </button>
                        )}

                        {/* Action buttons */}
                        {editingProjectId !== project.id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingProjectId(project.id)
                                setEditingName(project.name)
                              }}
                              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Yeniden Adlandır"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteProject(project.id)
                              }}
                              className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Footer - Current Project Info */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <p className="text-xs text-gray-400">Aktif Şema</p>
                <p className="font-medium text-sm truncate">
                  {currentProject ? currentProject.name : '⭐ Ana Şema - T3 Vakfı'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Header Overlay */}
        {/* Canvas - Full Screen */}
        <div className="w-full h-screen">
          <OrgCanvas
            currentProjectId={currentProject?.id || null}
            currentProjectName={currentProject?.name}
            isPresentationMode={isPresentationMode}
          />
        </div>


        {/* Controls Helper (Mobile) */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="md:hidden absolute bottom-6 right-6 z-10 bg-indigo-600 text-white rounded-full px-4 py-2 shadow-lg text-xs font-medium"
        >
          2 parmakla kaydırın
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title="Şemayı Sil"
          message="Bu şemayı silmek istediğinize emin misiniz?"
          confirmText="Evet, Sil"
          cancelText="İptal"
          type="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
    </main>
  )
}
