export type Dashboard = {
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

export type DashboardItem = {
  dashboardData: Dashboard;
  query: string;
  selected: boolean;
};

export type SavedChart = {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
};

export type DashboardLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};
