'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Mail, Briefcase, ListChecks } from 'lucide-react'
import { motion } from 'framer-motion'

interface Person {
  id: string
  name: string
  role: string
  unit: string
  photo: string | null
  responsibilities: string[]
  contact?: {
    email?: string
    phone?: string
  }
}

interface PersonModalProps {
  person: Person | null
  isOpen: boolean
  onClose: () => void
  unitTitle?: string
}

const PersonModal = ({ person, isOpen, onClose, unitTitle }: PersonModalProps) => {
  if (!person) return null

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-purple-500 to-purple-700 px-6 py-8 text-white">
                    <button
                      onClick={onClose}
                      className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-4">
                      {person.photo ? (
                        <img
                          src={person.photo}
                          alt={person.name}
                          className="w-20 h-20 rounded-full border-4 border-white/30 object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center">
                          <Briefcase className="w-10 h-10" />
                        </div>
                      )}
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-2xl font-bold leading-tight mb-1"
                        >
                          {person.name}
                        </Dialog.Title>
                        <p className="text-purple-100 text-sm font-medium">
                          {person.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-6 space-y-6">
                    {/* Unit */}
                    {unitTitle && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-4 h-4 text-gray-500" />
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Birim
                          </h4>
                        </div>
                        <p className="text-gray-900 font-medium">{unitTitle}</p>
                      </div>
                    )}

                    {/* Responsibilities */}
                    {person.responsibilities && person.responsibilities.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ListChecks className="w-4 h-4 text-gray-500" />
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Sorumluluklar
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {person.responsibilities.map((responsibility, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-gray-700"
                            >
                              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-purple-500" />
                              <span className="text-sm leading-relaxed">{responsibility}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Contact */}
                    {person.contact && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            İletişim
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {person.contact.email && (
                            <a
                              href={`mailto:${person.contact.email}`}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium block"
                            >
                              {person.contact.email}
                            </a>
                          )}
                          {person.contact.phone && (
                            <a
                              href={`tel:${person.contact.phone}`}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium block"
                            >
                              {person.contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4">
                    <button
                      type="button"
                      className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                      onClick={onClose}
                    >
                      Kapat
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default PersonModal
