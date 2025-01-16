import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useTheme } from '../contexts/ThemeContext';
import { X, Plus, Minus, ChevronLeft, ChevronRight, Download, MoreVertical, Pin, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './gridLayoutTheme.css';
import { ChartRenderer } from './ChartRenderer'; 
import { DashboardLayout } from '../types/dashboard';
import { getProjectCharts, saveProjectChart, toggleChartPin, addChartToProjectDashboard, getProjectDashboardCharts, saveDashboardLayout, getDashboardLayouts, loadDashboardLayout, DashboardLayoutConfig, DashboardLayoutItem } from '../services/api';
import debounce from 'lodash/debounce';
import { SaveLayoutDialog } from './SaveLayoutDialog';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { DashboardItem } from '../types/dashboard';

const ResponsiveGridLayout = WidthProvider(Responsive) as unknown as React.ComponentType<{
  className: string;
  layouts: Layouts;
  breakpoints?: { [key: string]: number };
  cols?: { [key: string]: number };
  rowHeight?: number;
  onLayoutChange?: (currentLayout: Layout[], allLayouts: Layouts) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  margin?: [number, number];
  containerPadding?: [number, number];
  children?: React.ReactNode;
  useCSSTransforms?: boolean;
  transformScale?: number;
  style?: React.CSSProperties;
}>;

type Dashboard = {
  Name: string;
  Type: 'LineChart' | 'BarChart' | 'PieChart' | 'DonutChart' | 'ScatterPlot' | 'Histogram' | 'Table' | 'DoubleBarChart' | 'DualColorLineChart';
  X_axis_label: string;
  Y_axis_label: string;
  X_axis_data: string[] | number[];
  Y_axis_data: string[] | number[];
  labels: string[];
  Values: number[];
  Column_headers?: string[];
  Row_data?: string[][];
  Forecasted_X_axis_data?: string[];
  Forecasted_Y_axis_data?: number[];
  Y_axis_data_secondary?: number[];
};

type SavedChart = {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
  created_at: string;
  created_by: number;
};

interface DashboardViewProps {
  projectId: string;
  availableDashboards: DashboardItem[];
  onClose: () => void;
  layouts: { [key: string]: DashboardLayout[] };
  onLayoutChange: (layouts: { [key: string]: DashboardLayout[] }) => void;
}

type Layout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
};

type Layouts = {
  [P: string]: Layout[];
};


export default function DashboardView({ 
  projectId, 
  availableDashboards, 
  onClose,
  layouts,
  onLayoutChange 
}: DashboardViewProps) {
  const { showToast } = useToast();
  const [selectedDashboards, setSelectedDashboards] = useState<DashboardItem[]>(availableDashboards);
  const [selectedSavedCharts, setSelectedSavedCharts] = useState<SavedChart[]>([]);
  const [visibleCharts, setVisibleCharts] = useState<SavedChart[]>([]);

  // Save selected state when it changes
  useEffect(() => {
    const selectedNames = selectedDashboards
      .filter(d => d.selected)
      .map(d => d.dashboardData.Name);
    localStorage.setItem('selectedDashboards', JSON.stringify(selectedNames));
  }, [selectedDashboards]);

  const toggleDashboardSelection = (index: number) => {
    setSelectedDashboards(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  // Initialize layouts if they don't exist
  useEffect(() => {
    if (!layouts || Object.keys(layouts).length === 0) {
      const selectedCount = selectedDashboards.filter(d => d.selected).length;
      const initialLayouts = {
        lg: Array.from({ length: selectedCount }, (_, i) => ({
          i: i.toString(),
          x: (i % 2) * 6,
          y: Math.floor(i / 2) * 4,
          w: 6,
          h: 4,
          minW: 3,
          minH: 3
        })),
        // ... repeat for other breakpoints
      };
      onLayoutChange(initialLayouts);
    }
  }, [selectedDashboards]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentTheme } = useTheme();
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Save final state when component unmounts
      const selectedNames = selectedDashboards
        .filter(d => d.selected)
        .map(d => d.dashboardData.Name);
      localStorage.setItem('selectedDashboards', JSON.stringify(selectedNames));
      localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
    };
  }, [selectedDashboards, layouts]);

  const [activeTab, setActiveTab] = useState<'available' | 'saved'>('available');
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);

  useEffect(() => {
    const fetchSavedCharts = async () => {
      try {
        const charts = await getProjectCharts(Number(projectId));
        setSavedCharts(charts);
      } catch (error) {
        console.error('Error fetching saved charts:', error);
      }
    };
    fetchSavedCharts();
  }, [projectId]);

  const handleSaveChart = async (chart: DashboardItem) => {
    try {
      await saveProjectChart(Number(projectId), {
        name: chart.dashboardData.Name,
        query: chart.query,
        chart_data: chart.dashboardData
      });
      // Refresh saved charts
      const charts = await getProjectCharts(Number(projectId));
      setSavedCharts(charts);
    } catch (error) {
      console.error('Error saving chart:', error);
    }
  };

  const handleDownloadChart = (chart: DashboardItem) => {
    // Implement chart download logic here
    console.log('Downloading chart:', chart);
  };

  const toggleSavedChartSelection = (chart: SavedChart) => {
    setSelectedSavedCharts(prev => {
      const isSelected = prev.some(c => c.id === chart.id);
      if (isSelected) {
        return prev.filter(c => c.id !== chart.id);
      } else {
        return [...prev, chart];
      }
    });
  };

  useEffect(() => {
    const savedSelection = localStorage.getItem('selectedSavedCharts');
    if (savedSelection) {
      const savedChartIds = JSON.parse(savedSelection);
      setSelectedSavedCharts(
        savedCharts.filter(chart => savedChartIds.includes(chart.id))
      );
    }
  }, [savedCharts]);

  useEffect(() => {
    const selectedIds = selectedSavedCharts.map(chart => chart.id);
    localStorage.setItem('selectedSavedCharts', JSON.stringify(selectedIds));
  }, [selectedSavedCharts]);

  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdownId]);

  // Get the dashboard button position for the animation origin
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Find the dashboard button element
    const button = document.querySelector('[data-dashboard-button]');
    if (button) {
      const rect = button.getBoundingClientRect();
      setButtonPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    }
  }, []);

  const [pinnedCharts, setPinnedCharts] = useState<number[]>([]);

  useEffect(() => {
    const fetchPinnedCharts = async () => {
      try {
        const charts = await getProjectDashboardCharts(Number(projectId));
        // Store the IDs of pinned charts
        setPinnedCharts(charts.map(chart => chart.id));
      } catch (error) {
        console.error('Error fetching pinned charts:', error);
      }
    };

    fetchPinnedCharts();
  }, [projectId]);

  const handleAddToDashboard = async (chart: SavedChart) => {
    try {
      await addChartToProjectDashboard(Number(projectId), chart.id);
      // Update local state
      setSavedCharts(prev => 
        prev.map(c => 
          c.id === chart.id 
            ? { ...c, is_pinned: true }
            : c
        )
      );
      // Add to pinned charts
      setPinnedCharts(prev => [...prev, chart.id]);
    } catch (error) {
      console.error('Error pinning chart:', error);
    }
  };

  // Add new refs and state for optimization
  const gridRef = useRef<HTMLDivElement>(null);

  // Add debounced layout change handler
  const debouncedLayoutChange = useCallback(
    debounce((currentLayout: Layout[], allLayouts: Layouts) => {
      onLayoutChange(allLayouts);
      // Trigger chart rerender only after layout is settled
      const chartElements = document.querySelectorAll('[data-chart-container]');
      chartElements.forEach(element => {
        const chart = element.querySelector('[data-chart]');
        if (chart) {
          (chart as any).__chartist?.update();
        }
      });
    }, 150),
    [onLayoutChange]
  );

  // Add visibility change handler
  const handleVisibilityChange = useCallback((entries: IntersectionObserverEntry[]) => {
    setVisibleCharts(prev => {
      const next = new Set([...prev]);
      entries.forEach(entry => {
        const chartId = entry.target.getAttribute('data-chart-id');
        const chart = savedCharts.find(c => `chart-${c.id}` === chartId);
        if (chart) {
          if (entry.isIntersecting) {
            next.add(chart);
          } else {
            next.delete(chart);
          }
        }
      });
      return Array.from(next);  // Convert Set back to array
    });
  }, [savedCharts]);

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(handleVisibilityChange, {
      root: gridRef.current,
      rootMargin: '100px',
      threshold: 0
    });

    const charts = document.querySelectorAll('[data-chart-container]');
    charts.forEach(chart => observer.observe(chart));

    return () => observer.disconnect();
  }, [handleVisibilityChange]);

  // Add optimized chart rendering function
  const renderChart = useCallback((item: DashboardItem | SavedChart, index: number) => {
    console.log('Rendering chart:', item); // Debug log
    
    const chartId = `chart-${(item as SavedChart).id || (item as DashboardItem).dashboardData.Name}`.replace(/\s+/g, '-');
    const chartData = (item as SavedChart).chart_data || (item as DashboardItem).dashboardData;
    
    return (
      <div 
        key={index.toString()}
        data-chart-container
        data-chart-id={chartId}
        className={`chart-wrapper ${currentTheme === 'light' ? 'bg-white' : 'bg-gray-900'}`}
      >
        <ChartRenderer
          dashboard={chartData}
          hideDownload={true}
          dimensions={{
            width: 100,
            height: 100
          }}
          data-chart
        />
      </div>
    );
  }, [currentTheme, visibleCharts]);

  const [isSaveLayoutOpen, setIsSaveLayoutOpen] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<DashboardLayoutConfig[]>([]);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Fetch saved layouts
  useEffect(() => {
    const fetchLayouts = async () => {
      try {
        const layouts = await getDashboardLayouts(Number(projectId));
        setSavedLayouts(layouts);
      } catch (error) {
        console.error('Error fetching layouts:', error);
      }
    };
    fetchLayouts();
  }, [projectId]);

  // Handle layout save
  const handleSaveLayout = async (name: string) => {
    try {
      setIsLoadingLayout(true);
      
      // Get current layout items with chartId
      const layoutItems = layouts.lg.map(item => ({
        i: item.i,
        chartId: parseInt(item.i.replace('chart-', '')), // Add chartId
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW || 3,
        minH: item.minH || 3
      }));

      // Get charts data
      const chartsData = savedCharts.filter(chart => 
        layoutItems.some(item => item.chartId === chart.id)
      );

      const layoutConfig = {
        name,
        layout_data: {
          lg: layoutItems
        },
        charts: chartsData
      };

      console.log('Saving layout:', layoutConfig);
      await saveDashboardLayout(Number(projectId), layoutConfig);
      
      // Refresh saved layouts list
      const updatedLayouts = await getDashboardLayouts(Number(projectId));
      setSavedLayouts(updatedLayouts);
      setIsSaveLayoutOpen(false);
    } catch (error) {
      console.error('Error saving layout:', error);
    } finally {
      setIsLoadingLayout(false);
    }
  };

  // Handle layout load
  const handleLoadLayout = async (layoutId: number) => {
    try {
      setIsLoadingLayout(true);
      const layout = await loadDashboardLayout(Number(projectId), layoutId);
      
      if (!layout?.layout_data || !layout?.charts) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND);
      }

      // Set the saved charts
      setSelectedSavedCharts(layout.charts);
      
      // Instead of clearing selectedDashboards, update their selected state
      setSelectedDashboards(prev => prev.map(dashboard => ({
        ...dashboard,
        selected: false // Deselect all available dashboards when loading a saved layout
      })));

      // Transform layout data ensuring all required properties are present
      const gridLayouts = {
        lg: layout.layout_data.lg.map((item) => ({
          i: `chart-${item.chartId}`,
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          w: Number(item.w) || 6,
          h: Number(item.h) || 4,
          minW: Number(item.minW) || 3,
          minH: Number(item.minH) || 3
        }))
      };

      console.log('Transformed layout:', gridLayouts);
      
      // Update layouts state
      onLayoutChange(gridLayouts);
      
      setIsLayoutMenuOpen(false);
      showToast('Dashboard layout loaded successfully', 'success');
    } catch (err: any) {
      console.error('Error loading layout:', err);
      showToast(err.message || ERROR_MESSAGES.SERVER_ERROR, 'error');
    } finally {
      setIsLoadingLayout(false);
    }
  };

  return (
    <motion.div 
      initial={{ 
        clipPath: `circle(0px at ${buttonPosition.x}px ${buttonPosition.y}px)`,
        opacity: 0 
      }}
      animate={{ 
        clipPath: `circle(${Math.hypot(window.innerWidth, window.innerHeight)}px at ${buttonPosition.x}px ${buttonPosition.y}px)`,
        opacity: 1 
      }}
      exit={{ 
        clipPath: `circle(0px at ${buttonPosition.x}px ${buttonPosition.y}px)`,
        opacity: 0 
      }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 40
      }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ delay: 0.1 }}
        className={`${currentTheme === 'light' ? 'bg-white/80' : 'bg-[#1A1A1A]/80'} rounded-3xl w-[95vw] h-[95vh] flex flex-col overflow-hidden`}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <motion.div
            initial={false}
            animate={{
              width: isSidebarOpen ? "300px" : "0px",
              opacity: isSidebarOpen ? 1 : 0
            }}
            transition={{ duration: 0.2 }}
            className={`h-full border-r flex-shrink-0 ${
              currentTheme === 'light' 
                ? 'border-gray-200 bg-gray-50' 
                : 'border-gray-800 bg-[#141414]'
            }`}
          >
            <div className="h-full overflow-hidden flex flex-col">
              {/* Tab switcher */}
              <div className={`flex border-b ${
                currentTheme === 'light' ? 'border-gray-200' : 'border-gray-800'
              }`}>
                <button
                  onClick={() => setActiveTab('available')}
                  className={`flex-1 p-4 text-center font-medium ${
                    activeTab === 'available'
                      ? currentTheme === 'light'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'border-b-2 border-blue-400 text-blue-400'
                      : currentTheme === 'light'
                        ? 'text-gray-500'
                        : 'text-gray-400'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 p-4 text-center font-medium ${
                    activeTab === 'saved'
                      ? currentTheme === 'light'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'border-b-2 border-blue-400 text-blue-400'
                      : currentTheme === 'light'
                        ? 'text-gray-500'
                        : 'text-gray-400'
                  }`}
                >
                  Saved
                </button>
              </div>

              <div className="p-2 overflow-y-auto flex-1">
                {activeTab === 'available' ? (
                  // Available charts list
                  availableDashboards.map((item, index) => (
                    <div
                      key={item.dashboardData.Name}
                      onClick={() => toggleDashboardSelection(index)}
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer mb-2 transition-colors ${
                        selectedDashboards[index].selected
                          ? currentTheme === 'light'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-blue-900/20 border border-blue-800'
                          : currentTheme === 'light'
                            ? 'hover:bg-gray-100'
                            : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        selectedDashboards[index].selected
                          ? currentTheme === 'light'
                            ? 'bg-blue-100'
                            : 'bg-blue-900/30'
                          : currentTheme === 'light'
                            ? 'bg-gray-100'
                            : 'bg-gray-800'
                      }`}>
                        {selectedDashboards[index].selected ? (
                          <Minus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-blue-600'
                              : 'text-blue-400'
                          }`} />
                        ) : (
                          <Plus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-gray-600'
                              : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium break-words ${
                          currentTheme === 'light'
                            ? 'text-gray-900'
                            : 'text-gray-100'
                        }`}>
                          {item.dashboardData.Name}
                        </p>
                        <p className={`text-sm break-words whitespace-normal ${
                          currentTheme === 'light'
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}>
                          {item.query}
                        </p>
                      </div>
                      {/* Move dropdown menu outside the clickable area */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === index ? null : index);
                          }}
                          className={`p-2 rounded-lg ${
                            currentTheme === 'light'
                              ? 'hover:bg-gray-200'
                              : 'hover:bg-gray-800'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openDropdownId === index && (
                          <div 
                            className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ${
                              currentTheme === 'light'
                                ? 'bg-white'
                                : 'bg-gray-800'
                            } ring-1 ring-black ring-opacity-5 z-10`}
                          >
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveChart(item);
                                  setOpenDropdownId(null);
                                }}
                                className={`block px-4 py-2 text-sm w-full text-left ${
                                  currentTheme === 'light'
                                    ? 'text-gray-700 hover:bg-gray-100'
                                    : 'text-gray-200 hover:bg-gray-700'
                                }`}
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadChart(item);
                                  setOpenDropdownId(null);
                                }}
                                className={`block px-4 py-2 text-sm w-full text-left ${
                                  currentTheme === 'light'
                                    ? 'text-gray-700 hover:bg-gray-100'
                                    : 'text-gray-200 hover:bg-gray-700'
                                }`}
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Saved charts list
                  savedCharts.map((chart) => (
                    <div
                      key={chart.id}
                      onClick={() => toggleSavedChartSelection(chart)}
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer mb-2 transition-colors ${
                        selectedSavedCharts.some(c => c.id === chart.id)
                          ? currentTheme === 'light'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-blue-900/20 border border-blue-800'
                          : currentTheme === 'light'
                            ? 'hover:bg-gray-100'
                            : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        selectedSavedCharts.some(c => c.id === chart.id)
                          ? currentTheme === 'light'
                            ? 'bg-blue-100'
                            : 'bg-blue-900/30'
                          : currentTheme === 'light'
                            ? 'bg-gray-100'
                            : 'bg-gray-800'
                      }`}>
                        {selectedSavedCharts.some(c => c.id === chart.id) ? (
                          <Minus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-blue-600'
                              : 'text-blue-400'
                          }`} />
                        ) : (
                          <Plus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-gray-600'
                              : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium break-words ${
                          currentTheme === 'light'
                            ? 'text-gray-900'
                            : 'text-gray-100'
                        }`}>
                          {chart.name}
                        </p>
                        <p className={`text-sm break-words whitespace-normal ${
                          currentTheme === 'light'
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}>
                          {chart.query}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToDashboard(chart);
                        }}
                        className={`p-1.5 rounded-full transition-colors ${
                          pinnedCharts.includes(chart.id)
                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                        title={pinnedCharts.includes(chart.id) ? "Pinned to dashboard" : "Pin to dashboard"}
                      >
                        <Pin 
                          className={`w-4 h-4 ${
                            pinnedCharts.includes(chart.id)
                              ? 'fill-current stroke-2' 
                              : 'stroke-[1.5px]'
                          }`}
                        />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Main dashboard area */}
          <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              currentTheme === 'light'
                ? 'border-gray-200'
                : 'border-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    currentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-600'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
                </button>
                <h2 className={`font-semibold ${
                  currentTheme === 'light'
                    ? 'text-gray-900'
                    : 'text-gray-100'
                }`}>Dashboard View</h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Add Layout Menu */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                  >
                    <Menu className="w-4 h-4 mr-2" />
                    Layouts
                  </Button>
                  
                  {isLayoutMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-md shadow-lg ${
                      currentTheme === 'light' ? 'bg-white' : 'bg-gray-800'
                    } ring-1 ring-black ring-opacity-5 z-10`}>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsLayoutMenuOpen(false);
                            setIsSaveLayoutOpen(true);
                          }}
                          className={`block px-4 py-2 text-sm w-full text-left ${
                            currentTheme === 'light'
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-200 hover:bg-gray-700'
                          }`}
                        >
                          Save Current Layout
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        {savedLayouts.map((layout) => (
                          <button
                            key={layout.id}
                            onClick={() => handleLoadLayout(layout.id!)}
                            className={`block px-4 py-2 text-sm w-full text-left ${
                              currentTheme === 'light'
                                ? 'text-gray-700 hover:bg-gray-100'
                                : 'text-gray-200 hover:bg-gray-700'
                            }`}
                          >
                            {layout.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    currentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-600'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Charts grid */}
            <div className="flex-1 overflow-auto p-4" ref={gridRef}>
              <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                onLayoutChange={(currentLayout, allLayouts) => {
                  debouncedLayoutChange(currentLayout, allLayouts);
                }}
                isDraggable={true}
                isResizable={true}
                margin={[16, 16]}
                containerPadding={[16, 16]}
              >
                {/* Render saved charts */}
                {selectedSavedCharts.map((chart) => {
                  const key = `chart-${chart.id}`;
                  // Find the layout item for this chart
                  const layoutItem = layouts?.lg?.find(item => item.i === key);
                  
                  return (
                    <div 
                      key={key} 
                      data-grid={{
                        x: layoutItem?.x || 0,  // Use layout x or default to 0
                        y: layoutItem?.y || 0,  // Use layout y or default to 0
                        w: layoutItem?.w || 6,
                        h: layoutItem?.h || 4,
                        minW: layoutItem?.minW || 3,
                        minH: layoutItem?.minH || 3,
                        i: key
                      }}
                    >
                      <ChartRenderer
                        dashboard={chart.chart_data}
                        hideDownload={true}
                        dimensions={{
                          width: 100,
                          height: 100
                        }}
                      />
                    </div>
                  );
                })}

                {selectedDashboards
                  .filter(dashboard => dashboard.selected)
                  .map((dashboard) => {
                    const key = `chart-${dashboard.dashboardData.Name.replace(/\s+/g, '-')}`;
                    // Find the layout item for this dashboard
                    const layoutItem = layouts?.lg?.find(item => item.i === key);
                    
                    return (
                      <div 
                        key={key} 
                        data-grid={{
                          x: layoutItem?.x || 0,  // Use layout x or default to 0
                          y: layoutItem?.y || 0,  // Use layout y or default to 0
                          w: layoutItem?.w || 6,
                          h: layoutItem?.h || 4,
                          minW: layoutItem?.minW || 3,
                          minH: layoutItem?.minH || 3,
                          i: key
                        }}
                      >
                        <ChartRenderer
                          dashboard={dashboard.dashboardData}
                          hideDownload={true}
                          dimensions={{
                            width: 100,
                            height: 100
                          }}
                        />
                      </div>
                    );
                  })}
              </ResponsiveGridLayout>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Layout Dialog */}
      <SaveLayoutDialog
        open={isSaveLayoutOpen}
        onOpenChange={setIsSaveLayoutOpen}
        onSave={handleSaveLayout}
        isLoading={isLoadingLayout}
      />
    </motion.div>
  );
}
