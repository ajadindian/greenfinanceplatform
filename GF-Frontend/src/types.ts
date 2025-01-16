export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartScales {
  x: { title: string };
  y: { title: string };
}

export interface ChartOptions {
  scales: ChartScales;
}

export interface ChartSuggestion {
  type: string;
  title: string;
  description: string;
  labels: string[];
  datasets: ChartDataset[];
  options: ChartOptions;
} 