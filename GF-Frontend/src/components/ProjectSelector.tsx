import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getProjects, addProject } from '../services/api';
import { ChevronLeft, Loader2, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, themes } from '../utils/theme';
import { Dialog } from './ui/Dialog'
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { NavBar } from './NavBar';

interface Project {
  id: string;
  name: string;
}

interface NewProject {
  name: string;
  files: FileList | null;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newProject, setNewProject] = useState<NewProject>({
    name: '',
    files: null
  });
  const [userType, setUserType] = useState<'company' | 'employee'>('employee');
  const [isLoading, setIsLoading] = useState(false);
  const { currentTheme, setCurrentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false)
  const { showToast } = useToast();

  useEffect(() => {
    const storedUserType = localStorage.getItem('userType') as 'company' | 'employee' | null;
    if (storedUserType) {
      setUserType(storedUserType);
    }
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (error: any) {
      showToast(
        error.message || 'Failed to fetch projects',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    try {
      setIsLoading(true);
      setSelectedProject(projectId);
      showToast('Project selected successfully', 'success');
      navigate(`/project/${projectId}`);
    } catch (error: any) {
      showToast(
        error.message || 'Failed to select project',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await addProject({
        name: newProject.name,
        files: newProject.files
      })

      setIsAddProjectDialogOpen(false)
      await fetchProjects()
      setNewProject({
        name: '',
        files: null
      })
    } catch (error) {
      console.error('Error adding new project:', error)
      setError(error.response?.data?.message || 'Failed to add new project. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div 
        className={`min-h-screen flex items-center justify-center ${themeStyles.background}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ 
          backgroundImage: currentTheme === 'light' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : 'none',
          backgroundBlendMode: 'soft-light',
          opacity: 0.98
        }}
      >
        <motion.div 
          className={`max-w-md w-full space-y-8 ${themeStyles.cardBg} p-10 rounded-xl shadow-2xl relative`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
              className={`w-10 h-10 rounded-full ${themeStyles.cardBg} shadow-lg flex items-center justify-center`}
            >
              <motion.div
                initial={false}
                animate={{
                  rotate: currentTheme === 'light' ? 0 : 180,
                  scale: currentTheme === 'light' ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="absolute"
              >
                <Sun className={themeStyles.subtext} />
              </motion.div>
              <motion.div
                initial={false}
                animate={{
                  rotate: currentTheme === 'light' ? -180 : 0,
                  scale: currentTheme === 'light' ? 0 : 1
                }}
                transition={{ duration: 0.3 }}
                className="absolute"
              >
                <Moon className={themeStyles.subtext} />
              </motion.div>
            </button>
          </div>

          <div className="space-y-6">
            <h2 className={`text-center text-3xl font-extrabold ${themeStyles.text}`}>
              Select a Project
            </h2>
            <p className={`text-center text-sm ${themeStyles.subtext}`}>
              Choose a project to view details or add a new one
            </p>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <div className="space-y-3">
            {projects.map((project) => (
              <Button
                key={project.id}
                onClick={() => handleProjectSelect(project.id)}
                className={`w-full ${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} transition-colors duration-200`}
              >
                {project.name}
              </Button>
            ))}

            {userType === 'company' && (
              <Button
                onClick={() => setIsAddProjectDialogOpen(true)}
                className={`w-full ${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} transition-colors duration-200`}
              >
                Add a New Project
              </Button>
            )}
          </div>
        </motion.div>

        {/* Add Project Dialog */}
        <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
          <Dialog.Content className={`${themeStyles.cardBg} border ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <Dialog.Header>
              <Dialog.Title className={`${themeStyles.text} text-xl font-semibold`}>
                Add New Project
              </Dialog.Title>
              <Dialog.Description className={themeStyles.subtext}>
                Create a new project and upload related files.
              </Dialog.Description>
            </Dialog.Header>

            <form onSubmit={handleNewProjectSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${themeStyles.text}`}>
                    Project Name
                  </label>
                  <Input
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name"
                    className={`w-full ${themeStyles.inputBg} ${themeStyles.text} border-${currentTheme === 'dark' ? 'gray-700' : 'gray-200'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium ${themeStyles.text}`}>
                    Project Files
                  </label>
                  <div className={`${themeStyles.inputBg} rounded-md p-2 border ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setNewProject({ ...newProject, files: e.target.files || null })}
                      className={`w-full text-sm ${themeStyles.subtext} 
                        file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                        file:text-sm file:font-semibold 
                        ${currentTheme === 'dark' 
                          ? 'file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600' 
                          : 'file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
                        } 
                        transition-colors duration-200`}
                    />
                  </div>
                </div>
              </div>

              <Dialog.Footer>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddProjectDialogOpen(false)}
                  className={`${currentTheme === 'dark' 
                    ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700' 
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'}`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-xl max-w-sm w-full mx-4`}>
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className={`text-center font-medium ${themeStyles.text}`}>
                  Creating your project...
                </p>
                <p className={`text-center text-sm ${themeStyles.subtext}`}>
                  This may take a moment
                </p>
              </div>
            </div>
          </div>
        )}

        <NavBar />
      </motion.div>
    </AnimatePresence>
  );
}
