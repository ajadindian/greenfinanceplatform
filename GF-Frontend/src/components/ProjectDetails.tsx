import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { MessageSquare, Trash2, Loader2, Plus, Edit, BarChart2, FileSpreadsheet, ChevronLeft, Sun, Moon, DownloadIcon, Download, FileEdit, X, LineChart } from 'lucide-react';
import { getProjectDetails, uploadFile, getProjectPL, getProjectFiles, deleteProjectFile, toggleChartPin, Dashboard, getProjectCharts, getProjectDashboardCharts, removeChartFromDashboard } from '../services/api';
import { LineChart as RechartsLineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.tsx';
import { Table } from './ui/Table';
import { Dialog } from './ui/Dialog';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Theme, themes } from '../utils/theme'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { ChartRenderer } from './ChartRenderer.tsx';
import { NavBar } from './NavBar';

interface ProjectFile {
  id: number;
  name: string;
  path: string;
  relative_path: string;
  addedBy: string;
  dateAdded: string;
  lastUpdated: string;
  size: number;
}

interface ProjectDetails {
  id: number;
  name: string;
  description: string;
  files: ProjectFile[];
}

interface ProjectPL {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

interface PLDataPoint {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface ProjectDashboardChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
}

interface SavedChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
  created_at: string;
  created_by: number;
}

const samplePLData: PLDataPoint[] = [
  { month: 'Jan', revenue: 50000, costs: 30000, profit: 20000 },
  { month: 'Feb', revenue: 55000, costs: 32000, profit: 23000 },
  { month: 'Mar', revenue: 48000, costs: 31000, profit: 17000 },
  { month: 'Apr', revenue: 60000, costs: 35000, profit: 25000 },
  { month: 'May', revenue: 58000, costs: 34000, profit: 24000 },
  { month: 'Jun', revenue: 65000, costs: 38000, profit: 27000 },
];

export function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProjectPL | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
  const [isUpdateFileDialogOpen, setIsUpdateFileDialogOpen] = useState(false);
  const [fileToUpdate, setFileToUpdate] = useState<ProjectFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false); // State to manage hover effect
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  const { currentTheme, setCurrentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  const [processingFiles, setProcessingFiles] = useState<Set<number>>(new Set());
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'dashboard'>('files');
  const [pinnedCharts, setPinnedCharts] = useState<SavedChart[]>([]);

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  useEffect(() => {
    const fetchPinnedCharts = async () => {
      if (!projectId) return;
      try {
        const charts = await getProjectDashboardCharts(Number(projectId));
        setPinnedCharts(charts);
      } catch (error) {
        console.error('Error fetching pinned charts:', error);
      }
    };
    
    fetchPinnedCharts();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    if (!projectId) {
      setError('No project ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const numericProjectId = parseInt(projectId);
      const [details, plData, filesData] = await Promise.all([
        getProjectDetails(numericProjectId),
        getProjectPL(numericProjectId),
        getProjectFiles(numericProjectId)
      ]);
      
      setProject(details);
      setProfitLoss(plData);
      setError(null);
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !projectId) return;

    try {
      setIsUploading(true);
      // Add temporary IDs for loading state
      const tempIds = Array.from(files).map((_, i) => -1 - i);
      setProcessingFiles(new Set(tempIds));
      
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i], parseInt(projectId), false);
      }
      await fetchProjectDetails();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files');
    } finally {
      setIsUploading(false);
      setProcessingFiles(new Set());
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!projectId) return;
    try {
      setIsDeleting(true);
      // Immediately update UI by removing the file from the project state
      setProject(prev => prev ? {
        ...prev,
        files: prev.files.filter(file => file.id !== fileId)
      } : null);
      
      // Close dialog and show message
      setIsDeleteDialogOpen(false);
      setShowDeleteMessage(true);
      
      // Continue with backend deletion
      await deleteProjectFile(parseInt(projectId), fileId);
      
      // Hide the message after 5 seconds
      setTimeout(() => setShowDeleteMessage(false), 5000);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file. Please try again.');
      // Optionally refresh to get the correct state if backend deletion failed
      await fetchProjectDetails();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMultipleFileUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0 || !projectId) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i], parseInt(projectId), false);
      }
      await fetchProjectDetails();
      setIsAddFileDialogOpen(false);
    } catch (error) {
      setError('Failed to upload files');
      console.error('Error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChatTransition = () => {
    // Trigger left swipe animation then navigate
    const transition = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate(`/chat/${projectId}`);
    };
    transition();
  };

  const handleFileUpdate = async (e: React.ChangeEvent<HTMLInputElement>, fileId: number) => {
    const files = e.target.files;
    if (!files || !projectId) return;

    try {
      setIsUploading(true);
      await uploadFile(files[0], parseInt(projectId), false, true);
      await fetchProjectDetails();
      setIsUpdateFileDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error updating file:', error);
      setError('Failed to update file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFromDashboard = async (chartId: number) => {
    if (!projectId) return;
    try {
      await removeChartFromDashboard(Number(projectId), chartId);
      setPinnedCharts(prev => prev.filter(chart => chart.id !== chartId));
    } catch (error) {
      console.error('Error removing chart from dashboard:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`min-h-screen ${themeStyles.background} p-8`}
        style={{ 
          backgroundImage: currentTheme === 'light' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : 'none',
          backgroundBlendMode: 'soft-light',
          opacity: 0.98
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/projects')}
                className={`p-2 ${themeStyles.cardBg} shadow-lg ${themeStyles.text} rounded-full hover:bg-opacity-90 transition-colors duration-200`}
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
              <h1 className={`text-4xl font-semibold ${themeStyles.text}`}>
                {project?.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <motion.div className={`rounded-full shadow-lg overflow-hidden ${themeStyles.cardBg}`}>
                <button
                  onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
                  className="w-10 h-10 relative flex items-center justify-center"
                  title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
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
              </motion.div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className={`${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} rounded-full flex items-center gap-2 shadow-lg transition-all duration-200 min-w-[140px] px-4 py-2`}
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Files</span>
              </Button>
              <Button 
                onClick={handleChatTransition}
                className={`${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} rounded-full flex items-center gap-2 shadow-lg transition-all duration-200 min-w-[100px] px-4 py-2`}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Chat</span>
              </Button>
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'files' | 'dashboard')}
            className="space-y-4"
          >
            <TabsList className={`inline-flex h-10 items-center justify-center rounded-full p-1 bg-white dark:bg-slate-950 shadow-lg`}>
              <TabsTrigger 
                value="files"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-1.5 text-sm font-medium 
                  transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 
                  data-[state=active]:bg-teal-500 data-[state=active]:text-white
                  data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-100
                  dark:data-[state=inactive]:text-slate-400 dark:data-[state=inactive]:hover:bg-slate-800/50`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger 
                value="dashboard"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-1.5 text-sm font-medium 
                  transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 
                  data-[state=active]:bg-teal-500 data-[state=active]:text-white
                  data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-100
                  dark:data-[state=inactive]:text-slate-400 dark:data-[state=inactive]:hover:bg-slate-800/50`}
              >
                <RechartsLineChart className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            <TabsContent 
              value="files"
              className="mt-4"
              style={{
                animation: "fadeIn 0.5s ease-out"
              }}
            >
              {/* Files Section */}
              <div className="space-y-4">
                <Card className="shadow-md overflow-hidden">
                  <CardContent className="p-4">
                    <div className={`${themeStyles.cardBg} rounded-lg shadow-lg overflow-hidden`}>
                      <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${themeStyles.borderColor}`}>
                          <thead>
                            <tr>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Name
                              </th>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Added By
                              </th>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Date Added
                              </th>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Last Updated
                              </th>
                              <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${themeStyles.borderColor} border-t ${themeStyles.borderColor}`}>
                            {project?.files.length === 0 && processingFiles.size === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-4">
                                    <FileSpreadsheet className={`h-12 w-12 ${themeStyles.subtext}`} />
                                    <div className={`text-lg font-medium ${themeStyles.text}`}>
                                      No files have been added to this project yet
                                    </div>
                                    <div className={`text-sm ${themeStyles.subtext}`}>
                                      To begin, click on "Add Files" button above
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <>
                                {project?.files.map((file, index) => (
                                  <tr key={file.id} className={`border-b ${themeStyles.borderColor}`}>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.text}`}>
                                      {file.name}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>
                                      {file.addedBy}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>
                                      {new Date(file.dateAdded).toLocaleDateString()}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>
                                      {new Date(file.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex justify-end space-x-2">
                                        <button 
                                          onClick={() => {
                                            setFileToUpdate(file);
                                            setIsUpdateFileDialogOpen(true);
                                          }}
                                          className={`${themeStyles.text} hover:${themeStyles.linkHoverColor}`}
                                        >
                                          <FileEdit className="h-5 w-5" />
                                        </button>
                                        <button className={`${themeStyles.text} hover:${themeStyles.linkHoverColor}`}>
                                          <Download className="h-5 w-5" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setFileToDelete(file);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          className={`${themeStyles.text} hover:text-red-600`}
                                        >
                                          <Trash2 className="h-5 w-5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {/* Add loading rows */}
                                {Array.from(processingFiles).map((tempId) => (
                                  <tr key={tempId} className={`border-b ${themeStyles.borderColor} animate-pulse`}>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.text}`}>
                                      <div className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        <span>Uploading file...</span>
                                      </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>-</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>-</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>-</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">-</td>
                                  </tr>
                                ))}
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent 
              value="dashboard"
              className="mt-4"
              style={{
                animation: "fadeIn 0.5s ease-out"
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                {pinnedCharts.map((chart) => (
                  <Card key={chart.id} className={`${themeStyles.cardBg} shadow-lg overflow-hidden`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
                      <CardTitle className={`text-base font-medium text-black`}>
                        {chart.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveFromDashboard(chart.id)}
                          className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 
                            transition-colors text-gray-500 hover:text-red-600`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 pb-2">
                      <div className="h-[300px] w-full">
                        <ChartRenderer
                          dashboard={chart.chart_data}
                          hideDownload={true}
                          dimensions={{ width: 100, height: 300 }}
                        />
                      </div>
                      <div className={`text-xs mt-2 text-black border-t pt-2`}>
                        {chart.query}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pinnedCharts.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <BarChart2 className={`h-12 w-12 ${themeStyles.subtext} mb-4`} />
                    <h3 className={`text-lg font-medium ${themeStyles.text}`}>
                      No charts pinned yet
                    </h3>
                    <p className={`text-sm ${themeStyles.subtext} mt-2 text-center max-w-md`}>
                      Pin charts from your analysis to create a custom dashboard view
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <NavBar />
      </motion.div>

      <Dialog open={isUpdateFileDialogOpen} onOpenChange={setIsUpdateFileDialogOpen}>
        <Dialog.Content className={`${themeStyles.cardBg} sm:max-w-[425px] p-6 rounded-lg shadow-xl`}>
          <Dialog.Header className="mb-4">
            <Dialog.Title className={`text-xl font-semibold ${themeStyles.text}`}>
              Update File
            </Dialog.Title>
            <Dialog.Description className={`${themeStyles.subtext} mt-1.5`}>
              Upload a new version of "{fileToUpdate?.name}"
            </Dialog.Description>
          </Dialog.Header>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="updateFile" className={`text-right ${themeStyles.text}`}>
                File
              </Label>
              <div className="col-span-3">
                <Input
                  id="updateFile"
                  type="file"
                  onChange={(e) => fileToUpdate && handleFileUpdate(e, fileToUpdate.id)}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 
                    file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 
                    hover:file:bg-teal-100 text-sm text-gray-600 w-full cursor-pointer
                    border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
          <Dialog.Footer className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsUpdateFileDialogOpen(false)}
              className={`${themeStyles.buttonBg} ${themeStyles.buttonText} px-4 py-2 rounded-md hover:opacity-90`}
            >
              Cancel
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Content className={`${themeStyles.cardBg} sm:max-w-[425px] p-6 rounded-lg shadow-xl`}>
          <Dialog.Header className="mb-4">
            <Dialog.Title className={`text-xl font-semibold ${themeStyles.text}`}>
              Confirm Deletion
            </Dialog.Title>
            <Dialog.Description className={`${themeStyles.subtext} mt-1.5`}>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer className="mt-6 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={() => fileToDelete && handleDeleteFile(fileToDelete.id)}
              disabled={isDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {showDeleteMessage && (
        <div className="flex items-center justify-center p-4 bg-teal-50 border-t">
          <span className="text-teal-600 text-sm">
            File deleted successfully. Changes may take some time to reflect in chat.
          </span>
        </div>
      )}
    </AnimatePresence>
  );
}
