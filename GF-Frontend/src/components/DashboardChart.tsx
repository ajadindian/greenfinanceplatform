import React from 'react';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface DashboardChartProps {
  chart: any; // Update this type based on your data structure
  index: number;
  currentTheme: 'light' | 'dark';
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

const downloadTableAsXLSX = (dashboard: any, fileName: string) => {
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

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
    easing: 'easeInOutQuad'
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        padding: 5,
      },
      grid: {
        drawBorder: true,
        display: true
      }
    },
    x: {
      ticks: {
        padding: 5,
      },
      grid: {
        drawBorder: true,
        display: true
      }
    }
  },
  plugins: {
    legend: {
      position: 'right' as const,
      display: true
    }
  }
};

export const DashboardChart: React.FC<DashboardChartProps> = ({ chart, index, currentTheme }) => {
  const chartId = `chart-${index}`;
  const dashboardData = chart.chart_data || chart.dashboardData;

  return (
    <div className={`p-4 rounded-lg shadow-lg ${
      currentTheme === 'light' ? 'bg-white' : 'bg-gray-800'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-medium ${
          currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'
        }`}>
          {dashboardData.Name}
        </h3>
        <button
          onClick={() => dashboardData.Type === 'Table' 
            ? downloadTableAsXLSX(dashboardData, dashboardData.Name)
            : downloadChartAsPNG(chartId, dashboardData.Name)
          }
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div id={chartId} className="h-[300px]">
        {(() => {
          switch (dashboardData.Type) {
            case 'LineChart':
              return (
                <Line
                  data={{
                    labels: dashboardData.X_axis_data.map(String),
                    datasets: [{
                      label: dashboardData.Y_axis_label,
                      data: dashboardData.Y_axis_data,
                      borderColor: 'rgb(13, 148, 136)',
                      backgroundColor: 'rgba(13, 148, 136, 0.5)',
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 1000,
                      easing: 'easeInOutQuad'
                    }
                  }}
                />
              );

            case 'BarChart':
              return (
                <Bar
                  data={{
                    labels: dashboardData.X_axis_data.map(String),
                    datasets: [{
                      label: dashboardData.Y_axis_label,
                      data: dashboardData.Y_axis_data,
                      backgroundColor: 'rgba(13, 148, 136, 0.5)',
                      borderColor: 'rgb(13, 148, 136)',
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 1000,
                      easing: 'easeInOutQuad'
                    }
                  }}
                />
              );

            case 'PieChart':
            case 'DonutChart':
              return (
                <Pie
                  data={{
                    labels: dashboardData.labels,
                    datasets: [{
                      data: dashboardData.Values,
                      backgroundColor: [
                        'rgba(13, 148, 136, 0.7)',
                        'rgba(37, 99, 235, 0.7)',
                        'rgba(147, 51, 234, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                      ],
                      borderColor: [
                        'rgb(13, 148, 136)',
                        'rgb(37, 99, 235)',
                        'rgb(147, 51, 234)',
                        'rgb(239, 68, 68)',
                      ],
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 1000,
                      easing: 'easeInOutQuad'
                    },
                    cutout: dashboardData.Type === 'DonutChart' ? '50%' : undefined,
                  }}
                />
              );

            case 'Table':
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {dashboardData.Column_headers?.map((header: string, i: number) => (
                          <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dashboardData.Row_data?.map((row: string[], rowIndex: number) => (
                        <tr key={rowIndex}>
                          {row.map((cell: string, cellIndex: number) => (
                            <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
