import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Dashboard } from '../types/dashboard';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';

interface ChartRendererProps {
  dashboard: Dashboard;
  hideDownload?: boolean;
  dimensions?: { width: number; height: number };
  onResize?: () => void;
}

const downloadChartAsPNG = async (chartId: string, fileName: string) => {
  const chartElement = document.getElementById(chartId);
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${fileName}.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading chart:', error);
    }
  }
};

const downloadTableAsXLSX = (dashboard: Dashboard, fileName: string) => {
  try {
    const rowData = dashboard.Row_data || [];
    const worksheet = XLSX.utils.aoa_to_sheet([dashboard.Column_headers || [], ...rowData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error downloading table:', error);
  }
};

const getChartColors = (isDarkMode: boolean) => ({
  primary: [
    isDarkMode ? 'rgba(96, 165, 250, 0.7)' : 'rgba(54, 162, 235, 0.7)',   // Blue
    isDarkMode ? 'rgba(94, 234, 212, 0.7)' : 'rgba(75, 192, 192, 0.7)',   // Teal
    isDarkMode ? 'rgba(251, 146, 60, 0.7)' : 'rgba(255, 159, 64, 0.7)',   // Orange
    isDarkMode ? 'rgba(167, 139, 250, 0.7)' : 'rgba(153, 102, 255, 0.7)', // Purple
    isDarkMode ? 'rgba(251, 113, 133, 0.7)' : 'rgba(255, 99, 132, 0.7)',  // Pink
    isDarkMode ? 'rgba(250, 204, 21, 0.7)' : 'rgba(255, 206, 86, 0.7)',   // Yellow
    isDarkMode ? 'rgba(74, 222, 128, 0.7)' : 'rgba(46, 204, 113, 0.7)',   // Green
    isDarkMode ? 'rgba(248, 113, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)',   // Red
    isDarkMode ? 'rgba(192, 132, 252, 0.7)' : 'rgba(142, 68, 173, 0.7)',  // Violet
    isDarkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(52, 152, 219, 0.7)',   // Light Blue
  ],
  primaryBorder: [
    isDarkMode ? 'rgb(96, 165, 250)' : 'rgb(54, 162, 235)',     // Blue
    isDarkMode ? 'rgb(94, 234, 212)' : 'rgb(75, 192, 192)',     // Teal
    isDarkMode ? 'rgb(251, 146, 60)' : 'rgb(255, 159, 64)',     // Orange
    isDarkMode ? 'rgb(167, 139, 250)' : 'rgb(153, 102, 255)',   // Purple
    isDarkMode ? 'rgb(251, 113, 133)' : 'rgb(255, 99, 132)',    // Pink
    isDarkMode ? 'rgb(250, 204, 21)' : 'rgb(255, 206, 86)',     // Yellow
    isDarkMode ? 'rgb(74, 222, 128)' : 'rgb(46, 204, 113)',     // Green
    isDarkMode ? 'rgb(248, 113, 113)' : 'rgb(231, 76, 60)',     // Red
    isDarkMode ? 'rgb(192, 132, 252)' : 'rgb(142, 68, 173)',    // Violet
    isDarkMode ? 'rgb(56, 189, 248)' : 'rgb(52, 152, 219)',     // Light Blue
  ],
  doubleBar: {
    primary: {
      background: isDarkMode ? 'rgba(96, 165, 250, 0.7)' : 'rgba(54, 162, 235, 0.7)',
      border: isDarkMode ? 'rgb(96, 165, 250)' : 'rgb(54, 162, 235)'
    },
    secondary: {
      background: isDarkMode ? 'rgba(94, 234, 212, 0.7)' : 'rgba(75, 192, 192, 0.7)',
      border: isDarkMode ? 'rgb(94, 234, 212)' : 'rgb(75, 192, 192)'
    }
  },
  text: isDarkMode ? '#e2e8f0' : '#1e293b',  // slate-200 for dark, slate-800 for light
  grid: isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(15, 23, 42, 0.1)', // slate-200 at 10% for dark, slate-900 at 10% for light
  tooltip: {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    text: isDarkMode ? '#e2e8f0' : '#1e293b'
  }
});

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
    easing: 'easeInOutQuad'
  },
  resizeDelay: 0,
  elements: {
    line: {
      tension: 0.4
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: '',  // Will be set dynamically
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      ticks: {
        padding: 5,
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    },
    x: {
      title: {
        display: true,
        text: '',  // Will be set dynamically
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      ticks: {
        padding: 5,
        autoSkip: false,
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  },
  plugins: {
    legend: {
      position: 'right' as const,
      display: true,
      labels: {
        padding: 20,
        font: {
          size: 11
        },
        usePointStyle: true,
        generateLabels: (chart: any) => {
          const datasets = chart.data.datasets;
          
          // For single dataset charts (like line charts), hide legend if all colors are the same
          if (datasets.length === 1 && 
              !(datasets[0].backgroundColor instanceof Array) && 
              !(datasets[0].borderColor instanceof Array)) {
            return [];
          }

          // For charts with labels property (like pie charts)
          if (chart.data.labels) {
            return chart.data.labels.map((label: string, i: number) => ({
              text: `${label} (${datasets[0].data[i]})`,
              fillStyle: datasets[0].backgroundColor instanceof Array 
                ? datasets[0].backgroundColor[i] 
                : datasets[0].backgroundColor,
              strokeStyle: datasets[0].borderColor instanceof Array 
                ? datasets[0].borderColor[i] 
                : datasets[0].borderColor,
              lineWidth: 1,
              hidden: false,
              index: i
            }));
          }

          // For multi-dataset charts
          return datasets.map((dataset: any, i: number) => ({
            text: `${dataset.label} (${dataset.data[i]})`,
            fillStyle: dataset.backgroundColor,
            strokeStyle: dataset.borderColor,
            lineWidth: 1,
            hidden: false,
            index: i
          }));
        }
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        size: 12,
        weight: 'bold' as const
      },
      bodyFont: {
        size: 11
      },
      padding: 10,
      callbacks: {
        label: (context: any) => {
          const label = context.dataset.label || '';
          const value = context.raw;
          return `${label}: ${value}`;
        }
      }
    }
  }
};

const isValidDashboardData = (dashboard: Dashboard): boolean => {
  switch (dashboard.Type) {
    case 'LineChart':
    case 'BarChart':
    case 'ScatterPlot':
      return Boolean(
        dashboard.X_axis_data &&
        dashboard.Y_axis_data &&
        dashboard.X_axis_label &&
        dashboard.Y_axis_label
      );
    case 'PieChart':
    case 'DonutChart':
      return Boolean(
        dashboard.labels &&
        dashboard.Values &&
        dashboard.labels.length === dashboard.Values.length
      );
    case 'Table':
      return Boolean(
        dashboard.Column_headers &&
        dashboard.Row_data
      );
    case 'DoubleBarChart':
    case 'DualColorLineChart':
      return Boolean(
        dashboard.X_axis_data &&
        dashboard.Y_axis_data &&
        dashboard.Y_axis_data_secondary &&
        dashboard.X_axis_label &&
        dashboard.Y_axis_label
      );
    default:
      return false;
  }
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  dashboard, 
  hideDownload = false, 
  dimensions,
  onResize 
}) => {
  const { currentTheme } = useTheme();
  const { showToast } = useToast();
  const isDarkMode = currentTheme === 'dark';
  const chartId = `chart-${dashboard.Name.replace(/\s+/g, '-')}`;
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const chartColors = useMemo(() => getChartColors(isDarkMode), [isDarkMode]);
  
  if (!isValidDashboardData(dashboard)) {
    showToast(ERROR_MESSAGES.VALIDATION_ERROR, 'error');
    return null;
  }

  const handleChartError = (err: any) => {
    showToast(ERROR_MESSAGES.SERVER_ERROR, 'error');
    console.error('Chart rendering error:', err);
  };

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    setIsResizing(true);
    
    resizeTimeoutRef.current = setTimeout(() => {
      setIsResizing(false);
      if (onResize) onResize();
    }, 150); // Adjust debounce delay as needed
  }, [onResize]);

  useEffect(() => {
    const chartContainer = document.getElementById(chartId);
    if (!chartContainer || !onResize) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainer);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [chartId, onResize, handleResize]);

  const chartOptions = useMemo(() => ({
    ...commonOptions,
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isResizing ? 0 : 1000,
    },
    devicePixelRatio: 2,
    elements: {
      point: {
        radius: dimensions?.width && dimensions.width < 300 ? 2 : 4,
      },
      line: {
        borderWidth: dimensions?.width && dimensions.width < 300 ? 1 : 2,
      }
    },
    scales: {
      y: {
        ...commonOptions.scales.y,
        grid: {
          color: chartColors.grid
        },
        ticks: {
          color: chartColors.text
        },
        title: {
          ...commonOptions.scales.y.title,
          color: chartColors.text
        }
      },
      x: {
        ...commonOptions.scales.x,
        grid: {
          color: chartColors.grid
        },
        ticks: {
          color: chartColors.text
        },
        title: {
          ...commonOptions.scales.x.title,
          color: chartColors.text
        }
      }
    },
    plugins: {
      ...commonOptions.plugins,
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          font: {
            size: 12,
            weight: 'bold' as const
          },
          color: isDarkMode ? '#e2e8f0' : '#1e293b',
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10
        }
      },
      tooltip: {
        ...commonOptions.plugins.tooltip,
        backgroundColor: chartColors.tooltip.background,
        titleColor: chartColors.tooltip.text,
        bodyColor: chartColors.tooltip.text,
        borderColor: isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(15, 23, 42, 0.1)',
        borderWidth: 1
      }
    }
  }), [dimensions, isResizing, isDarkMode, chartColors]);

  return (
    <div className="w-full relative" style={{ height: dimensions ? '100%' : '400px' }}>
      <div 
        id={chartId} 
        className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} p-4 rounded-lg`}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {(() => {
          const chartContainerStyle = {
            position: 'relative' as const,
            width: '100%',
            height: '100%'
          };

          switch (dashboard.Type) {
            case 'LineChart':
              return (
                <div style={chartContainerStyle}>
                  <Line
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [{
                        label: dashboard.Y_axis_label,
                        data: dashboard.Y_axis_data,
                        borderColor: isDarkMode ? 'rgb(94, 234, 212)' : 'rgb(13, 148, 136)',
                        backgroundColor: (context) => {
                          const chart = context.chart;
                          const {ctx, chartArea} = chart;
                          if (!chartArea) return isDarkMode ? 'rgba(94, 234, 212, 0.1)' : 'rgba(13, 148, 136, 0.1)';
                          
                          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                          if (isDarkMode) {
                            gradient.addColorStop(0, 'rgba(94, 234, 212, 0.1)');
                            gradient.addColorStop(1, 'rgba(94, 234, 212, 0.4)');
                          } else {
                            gradient.addColorStop(0, 'rgba(13, 148, 136, 0.1)');
                            gradient.addColorStop(1, 'rgba(13, 148, 136, 0.4)');
                          }
                          return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                      }]
                    }}
                    options={chartOptions}
                  />
                </div>
              );

            case 'BarChart':
              return (
                <div style={chartContainerStyle}>
                  <Bar
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [{
                        label: dashboard.Y_axis_label,
                        data: dashboard.Y_axis_data,
                        backgroundColor: dashboard.X_axis_data.map((_, i) => chartColors.primary[i % chartColors.primary.length]),
                        borderColor: dashboard.X_axis_data.map((_, i) => chartColors.primaryBorder[i % chartColors.primaryBorder.length]),
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.7
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          ...chartOptions.scales.y,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawOnChartArea: true,
                            display: true
                          },
                          title: {
                            ...chartOptions.scales.y.title,
                            text: dashboard.Y_axis_label
                          }
                        },
                        x: {
                          ...chartOptions.scales.x,
                          grid: {
                            display: false
                          },
                          border: {
                            display: false
                          }
                        }
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'top' as const,
                          align: 'start' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'PieChart':
            case 'DonutChart':
              return (
                <div style={chartContainerStyle}>
                  <Pie
                    data={{
                      labels: dashboard.labels,
                      datasets: [{
                        data: dashboard.Values,
                        backgroundColor: chartColors.primary,
                        borderColor: chartColors.primaryBorder,
                        borderWidth: 1,
                        spacing: 5
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {},
                      cutout: '70%',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          ...chartOptions.plugins.legend,
                          position: 'bottom' as const
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'Table':
              return (
                <div className={dimensions ? "h-full overflow-auto" : "max-h-[400px] overflow-auto"}>
                  <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}>
                      <tr>
                        {dashboard.Column_headers?.map((header, i) => (
                          <th 
                            key={i} 
                            className={`px-6 py-3 text-left text-xs font-medium ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-500'
                            } uppercase tracking-wider`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} divide-y ${
                      isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                    }`}>
                      {dashboard.Row_data?.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex} 
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

            case 'DoubleBarChart':
              return (
                <div style={chartContainerStyle}>
                  <Bar
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [
                        {
                          label: dashboard.Y_axis_label,
                          data: dashboard.Y_axis_data,
                          backgroundColor: chartColors.doubleBar.primary.background,
                          borderColor: chartColors.doubleBar.primary.border,
                          borderWidth: 1,
                          borderRadius: 4,
                          barPercentage: 0.8,
                          categoryPercentage: 0.7
                        },
                        {
                          label: dashboard.Y_axis_label + ' Secondary',
                          data: dashboard.Y_axis_data_secondary,
                          backgroundColor: chartColors.doubleBar.secondary.background,
                          borderColor: chartColors.doubleBar.secondary.border,
                          borderWidth: 1,
                          borderRadius: 4,
                          barPercentage: 0.8,
                          categoryPercentage: 0.7
                        }
                      ]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawOnChartArea: true,
                            drawTicks: true,
                            display: true
                          },
                          title: {
                            ...chartOptions.scales.y.title,
                            text: dashboard.Y_axis_label
                          }
                        },
                        x: {
                          ...chartOptions.scales.x,
                          grid: {
                            display: false
                          },
                          title: {
                            ...chartOptions.scales.x.title,
                            text: dashboard.X_axis_label
                          }
                        }
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'top' as const,
                          align: 'start' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'DualColorLineChart':
              return (
                <div style={chartContainerStyle}>
                  <Line
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [{
                        label: dashboard.Y_axis_label,
                        data: dashboard.Y_axis_data,
                        borderColor: dashboard.Y_axis_data.map((_, i) => chartColors.primary[i % chartColors.primary.length]), // Multicolor line
                        backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
                        tension: 0.1,
                        pointRadius: 5,
                      }]
                    }}
                    options={chartOptions}
                  />
                </div>
              );

            default:
              return <div>Unsupported chart type</div>;
          }
        })()}
      </div>
    </div>
  );
}; 