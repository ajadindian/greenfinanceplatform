import React, { useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Search } from 'lucide-react'
import { SavedPrompt, getSavedPrompts, deleteSavedPrompt } from '../services/api'

interface SavedPromptsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectPrompt: (prompt: SavedPrompt) => void
  projectId: number
}

export default function SavedPromptsDialog({ isOpen, onClose, onSelectPrompt, projectId }: SavedPromptsDialogProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const savedPrompts = await getSavedPrompts(projectId)
        setPrompts(savedPrompts)
      } catch (error) {
        console.error('Error fetching saved prompts:', error)
      }
    }

    if (isOpen) {
      fetchPrompts()
    }
  }, [isOpen, projectId])

  const handleDelete = async (promptId: number) => {
    try {
      await deleteSavedPrompt(projectId, promptId)
      setPrompts(prompts.filter(p => p.id !== promptId))
    } catch (error) {
      console.error('Error deleting prompt:', error)
    }
  }

  const filteredPrompts = prompts.filter(prompt =>
    prompt.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                    Saved Prompts
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 w-5 h-5" />
                </div>

                {/* Prompts List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredPrompts.length > 0 ? (
                    filteredPrompts.map(prompt => (
                      <button
                        key={prompt.id}
                        onClick={() => {
                          onSelectPrompt(prompt)
                          onClose()
                        }}
                        className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="text-sm text-gray-600 dark:text-gray-300">{prompt.content}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      No saved prompts found.
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 