export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You don\'t have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_UPLOAD_ERROR: 'Failed to upload file. Please try again.',
  FILE_SIZE_ERROR: 'File size exceeds the maximum limit.',
  FILE_TYPE_ERROR: 'File type not supported.',
} as const; 