'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Target, ListChecks, Users } from 'lucide-react'
import { motion } from 'framer-motion'

interface Unit {
  id: string
  title: string
  description: string
  responsibilities: string[]
  parent?: string
}

interface Person {
  id: string
  name: string
  role: string
  unit: string
}

interface UnitDrawerProps {
  unit: Unit | null
  isOpen: boolean
  onClose: () => void
  people: Person[]
  onPersonClick: (personId: string) => void
}

const UnitDrawer = ({ unit, isOpen, onClose, people, onPersonClick }: UnitDrawerProps) => {
  if (!unit) return null

  const unitPeople = people.filter(p => p.unit === unit.id)

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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-auto bg-white shadow-2xl">
                    <motion.div
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="h-full"
                    >
                      {/* Header */}
                      <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 py-8 text-white">
                        <button
                          onClick={onClose}
                          className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-start gap-3">
                          <div className="mt-1 bg-white/20 p-2.5 rounded-lg">
                            <Target className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <Dialog.Title
                              as="h2"
                              className="text-2xl font-bold leading-tight mb-2"
                            >
                              {unit.title}
                            </Dialog.Title>
                            <p className="text-emerald-50 text-sm leading-relaxed">
                              {unit.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 px-6 py-6 space-y-8">
                        {/* Responsibilities */}
                        {unit.responsibilities && unit.responsibilities.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <ListChecks className="w-5 h-5 text-emerald-600" />
                              <h3 className="text-lg font-bold text-gray-900">
                                Sorumluluklar
                              </h3>
                            </div>
                            <ul className="space-y-3">
                              {unit.responsibilities.map((responsibility, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-3 text-gray-700 bg-gray-50 rounded-lg p-3"
                                >
                                  <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-sm leading-relaxed">{responsibility}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* People */}
                        {unitPeople.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Users className="w-5 h-5 text-emerald-600" />
                              <h3 className="text-lg font-bold text-gray-900">
                                Ekip Üyeleri
                              </h3>
                            </div>
                            <div className="space-y-2">
                              {unitPeople.map((person) => (
                                <button
                                  key={person.id}
                                  onClick={() => onPersonClick(person.id)}
                                  className="w-full text-left bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg p-4 transition-all duration-200 group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                      {person.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                        {person.name}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {person.role}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <button
                          type="button"
                          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
                          onClick={onClose}
                        >
                          Kapat
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default UnitDrawer
