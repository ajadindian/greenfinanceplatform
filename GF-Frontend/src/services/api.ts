import axios from 'axios'

const API_URL = 'http://127.0.0.1:5000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
})

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get the JWT token from localStorage
    const jwtToken = localStorage.getItem('token')
    
    // If token exists, add it to the Authorization header
    if (jwtToken) {
      config.headers['Authorization'] = `Bearer ${jwtToken}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Function to set the JWT token
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }
}

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/api/user/login', { email, password })
    const { token } = response.data
    setAuthToken(token)
    return response.data
  } catch (error) {
    throw error
  }
}

export const signup = async (userData: {
  name: string
  email: string
  password: string
  company_id: number 
  contact: string
  designation: string
}) => {
  try {
    const response = await api.post('/api/user/signup', userData)
    const { token } = response.data
    setAuthToken(token)
    return response.data
  } catch (error) {
    if (error.response) {
      throw error.response.data
    }
    throw error
  }
}

export const sendMessage = async (query: string, project: string) => {
  try {
    const response = await api.post('/api/chat', { 
      query, 
      project
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const uploadFile = async (file: File, projectId: number, isQuotation: boolean = false, isUpdate: boolean = false) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('project', projectId.toString())
  formData.append('is_quotation', isQuotation.toString())
  formData.append('is_update', isUpdate.toString())
  
  try {
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const getProjects = async () => {
  try {
    const response = await api.get('/api/projects')
    return response.data
  } catch (error) {
    throw error
  }
}

export const addProject = async (projectData: {
  name: string;
  files: FileList | null;
}) => {
  try {
    // First, create the project
    const projectResponse = await api.post('/api/projects', {
      name: projectData.name,
    });
    
    const projectId = projectResponse.data.id;

    // Upload files if any
    if (projectData.files) {
      for (let i = 0; i < projectData.files.length; i++) {
        await uploadFile(projectData.files[i], projectId);
      }
    }

    return projectResponse.data;
  } catch (error) {
    throw error;
  }
};

export const companyLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/api/company/login', { email, password })
    return response.data
  } catch (error) {
    throw error
  }
}

export const companySignup = async (companyData: {
  name: string
  email: string
  password: string
}) => {
  try {
    const response = await api.post('/api/company/signup', companyData)
    return response.data
  } catch (error) {
    if (error.response) {
      throw error.response.data
    }
    throw error
  }
}

export const addCompanyUser = async (userData: {
  name: string
  email: string
  password: string
  contact: string
  designation: string
}) => {
  try {
    const response = await api.post('/api/company/users', userData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getCompanies = async () => {
  try {
    const response = await api.get('/api/companies')
    return response.data
  } catch (error) {
    console.error('Error fetching companies:', error)
    throw error
  }
}

// Update these interfaces to match backend responses
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

export const getProjectDetails = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getProjectPL = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/pl`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getProjectFiles = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/files`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const deleteProjectFile = async (projectId: number, fileId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/files/${fileId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const downloadProjectFile = async (projectId: number, fileId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/files/${fileId}/download`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const logout = () => {
  setAuthToken(null)
}

// Add these new interfaces
interface ChartDataset {
  label: string;
  data: number[];
}

interface ChartScales {
  x: { title: string };
  y: { title: string };
}

interface ChartOptions {
  scales: ChartScales;
}

interface ChartSuggestion {
  type: string;
  title: string;
  description: string;
  labels: string[];
  datasets: ChartDataset[];
  options: ChartOptions;
}

interface ChartSuggestionsResponse {
  chart_suggestions: Array<{
    type: string;
    title: string;
    description: string;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
    }>;
    options: {
      scales: {
        x: { title: string };
        y: { title: string };
      };
    };
  }>;
}

// Add this interface before the other interfaces
export interface Dashboard {
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
}

// Interface for saved chart
export interface SavedChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
  created_at: string;
  created_by: number;
}

// Function to save a chart
export const saveProjectChart = async (
  projectId: number, 
  chartData: {
    name: string;
    query: string;
    chart_data: Dashboard;
  }
) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/charts`, chartData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Function to get saved charts
export const getProjectCharts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/charts`);
    return response.data as SavedChart[];
  } catch (error) {
    throw error;
  }
};

// Function to delete a saved chart
export const deleteProjectChart = async (projectId: number, chartId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/charts/${chartId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

interface ProjectDashboardChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
}

// Update the function to toggle pin status
export const toggleChartPin = async (projectId: number, chartId: number) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/charts/${chartId}/pin`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add chart to project dashboard
export const addChartToProjectDashboard = async (projectId: number, chartId: number) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/dashboard/charts/${chartId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get pinned dashboard charts
export const getProjectDashboardCharts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/dashboard/charts`);
    return response.data as SavedChart[];
  } catch (error) {
    throw error;
  }
};

// Remove chart from dashboard
export const removeChartFromDashboard = async (projectId: number, chartId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/dashboard/charts/${chartId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Interface for dashboard layout
export interface DashboardLayoutItem extends DashboardLayout {
  i: string; // chart ID
  chartId: number; // actual chart ID from database
}

export interface DashboardLayoutConfig {
  id?: number;
  name: string;
  project_id: number;
  layout_data: {
    [breakpoint: string]: DashboardLayoutItem[];
  };
  charts: SavedChart[]; // Include the actual chart data
  created_at?: string;
}

// Save dashboard layout
export const saveDashboardLayout = async (
  projectId: number, 
  layoutConfig: {
    name: string;
    layout_data: { [breakpoint: string]: DashboardLayoutItem[] };
    charts: SavedChart[];
  }
) => {
  try {
    console.log('Saving layout:', layoutConfig);
    const response = await api.post(
      `/api/projects/${projectId}/dashboard/layouts`, 
      layoutConfig
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get saved dashboard layouts
export const getDashboardLayouts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/dashboard/layouts`);
    return response.data as DashboardLayoutConfig[];
  } catch (error) {
    throw error;
  }
};

// Load specific dashboard layout
export const loadDashboardLayout = async (
  projectId: number, 
  layoutId: number
) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/dashboard/layouts/${layoutId}`
    );
    console.log('Loading layout:', response.data);
    return response.data as DashboardLayoutConfig;
  } catch (error) {
    throw error;
  }
};

export interface DashboardLayout {
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
}

// Get user settings
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    console.log('Calling getUserSettings API...');
    const response = await api.get('/api/user/settings');
    console.log('getUserSettings response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getUserSettings error:', error);
    throw error;
  }
};

// Get payment information
export const getPaymentInfo = async (): Promise<PaymentInfo> => {
  try {
    console.log('Calling getPaymentInfo API...');
    const response = await api.get('/api/user/payment');
    console.log('getPaymentInfo response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getPaymentInfo error:', error);
    throw error;
  }
};

export interface UserSettings {
  email: string;
  display_name: string;
  notifications_enabled: boolean;
  theme_preference: 'light' | 'dark';
}

export interface PaymentInfo {
  last4: string;
  expiry_month: number;
  expiry_year: number;
  brand: string;
}

export const updateUserSettings = async (updates: Partial<UserSettings>): Promise<UserSettings> => {
  try {
    const response = await api.patch('/api/user/settings', updates);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add this new function
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const response = await api.post('/api/user/settings/password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add these interfaces
export interface SavedPrompt {
  id: number;
  content: string;
  project_id: number;
  tags?: string[];
  created_at: string;
}

// Save a prompt
export const savePrompt = async (promptData: { 
  content: string; 
  project_id: number;
  tags?: string[] 
}) => {
  try {
    const response = await api.post(`/api/projects/${promptData.project_id}/prompts`, promptData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get saved prompts
export const getSavedPrompts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/prompts`);
    return response.data as SavedPrompt[];
  } catch (error) {
    throw error;
  }
};

// Delete a saved prompt
export const deleteSavedPrompt = async (projectId: number, promptId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/prompts/${promptId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
