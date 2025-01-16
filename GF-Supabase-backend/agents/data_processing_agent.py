import pandas as pd
import numpy as np
from typing import Dict, List, Any, Union
from .base_agent import BaseAgent
import asyncio

class DataProcessingAgent(BaseAgent):
    def __init__(self):
        super().__init__('data_processing')
        self.chunk_size = self.config.get('chunk_size', 1000)
        
    async def process(self, file_path: str) -> Dict[str, Any]:
        """Process an Excel file and return structured data"""
        try:
            # Read Excel file
            excel_data = await self._read_excel(file_path)
            
            # Process each sheet
            processed_data = {}
            metadata = {}
            
            for sheet_name, df in excel_data.items():
                # Process sheet in chunks
                chunks = self._create_chunks(df)
                processed_chunks = []
                
                for chunk in chunks:
                    # Clean and normalize chunk
                    cleaned_chunk = self._clean_chunk(chunk)
                    # Extract metadata
                    chunk_metadata = self._extract_metadata(cleaned_chunk)
                    # Process relationships
                    relationships = self._process_relationships(cleaned_chunk)
                    
                    processed_chunks.append({
                        'data': cleaned_chunk.to_dict(),
                        'metadata': chunk_metadata,
                        'relationships': relationships
                    })
                
                processed_data[sheet_name] = processed_chunks
                metadata[sheet_name] = self._aggregate_metadata(processed_chunks)
            
            return {
                'processed_data': processed_data,
                'metadata': metadata
            }
            
        except Exception as e:
            self.logger.error(f"Error processing file: {str(e)}")
            raise
    
    async def _read_excel(self, file_path: str) -> Dict[str, pd.DataFrame]:
        """Read Excel file asynchronously and return dict of DataFrames"""
        # Use run_in_executor for blocking IO operations
        loop = asyncio.get_event_loop()
        excel_file = await loop.run_in_executor(None, pd.ExcelFile, file_path)
        
        sheets = {}
        for sheet_name in excel_file.sheet_names:
            df = await loop.run_in_executor(None, pd.read_excel, excel_file, sheet_name)
            sheets[sheet_name] = df
            
        return sheets
    
    def _create_chunks(self, df: pd.DataFrame) -> List[pd.DataFrame]:
        """Split DataFrame into chunks based on configured chunk size"""
        return np.array_split(df, max(1, len(df) // self.chunk_size))
    
    def _clean_chunk(self, chunk: pd.DataFrame) -> pd.DataFrame:
        """Clean and normalize data chunk"""
        # Create a copy to avoid SettingWithCopyWarning
        chunk = chunk.copy()
        
        # Remove empty rows and columns
        chunk = chunk.dropna(how='all', axis=1).dropna(how='all', axis=0)
        
        # Standardize column names
        chunk.columns = [str(col).strip().lower().replace(' ', '_') 
                        for col in chunk.columns]
        
        # Handle missing values
        chunk = self._handle_missing_values(chunk)
        
        return chunk
    
    def _handle_missing_values(self, chunk: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values based on data type"""
        chunk = chunk.copy()  # Create a copy to avoid SettingWithCopyWarning
        for column in chunk.columns:
            if chunk[column].dtype in ['int64', 'float64']:
                # Replace inplace operation with assignment
                chunk[column] = chunk[column].fillna(chunk[column].mean())
            else:
                # Replace inplace operation with assignment
                chunk[column] = chunk[column].fillna('unknown')
        return chunk
    
    def _extract_metadata(self, chunk: pd.DataFrame) -> Dict[str, Any]:
        """Extract metadata from chunk"""
        return {
            'columns': list(chunk.columns),
            'data_types': chunk.dtypes.to_dict(),
            'row_count': len(chunk),
            'numeric_columns': list(chunk.select_dtypes(include=[np.number]).columns),
            'categorical_columns': list(chunk.select_dtypes(include=['object']).columns)
        }
    
    def _process_relationships(self, chunk: pd.DataFrame) -> List[Dict[str, str]]:
        """Identify potential relationships between columns"""
        relationships = []
        
        # Look for potential foreign key relationships
        for col in chunk.columns:
            if col.endswith('_id') or col.endswith('_key'):
                relationships.append({
                    'column': col,
                    'type': 'potential_foreign_key'
                })
        
        return relationships
    
    def _aggregate_metadata(self, chunks: List[Dict]) -> Dict[str, Any]:
        """Aggregate metadata from all chunks"""
        total_rows = sum(chunk['metadata']['row_count'] for chunk in chunks)
        all_columns = set()
        for chunk in chunks:
            all_columns.update(chunk['metadata']['columns'])
            
        return {
            'total_rows': total_rows,
            'total_chunks': len(chunks),
            'columns': list(all_columns)
        } 