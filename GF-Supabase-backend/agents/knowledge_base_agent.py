from typing import List, Dict, Any, Optional
from .base_agent import BaseAgent
from openai import OpenAI
from datetime import datetime
from supabase_manager import supabase_manager
import pandas as pd

class KnowledgeBaseAgent(BaseAgent):
    def __init__(self):
        super().__init__('knowledge_base')
        self.openai_client = OpenAI()
        self.embedding_model = self.config.get('embedding_model', 'text-embedding-3-small')
        self.vector_similarity_threshold = self.config.get('vector_similarity_threshold', 0.8)
        self.max_tokens_per_chunk = self.config.get('max_tokens_per_chunk', 1000)
        
    async def process(self, processed_data: Dict[str, Any], project_id: int) -> Dict[str, Any]:
        """Process and store data in the knowledge base"""
        try:
            # Extract text content from processed data
            chunks = self._prepare_chunks(processed_data)
            
            # Generate embeddings and store in Supabase
            stored_chunks = []
            for chunk in chunks:
                embedding = await self._generate_embedding(chunk['content'])
                
                # Store chunk with embedding
                result = await self._store_chunk(
                    project_id=project_id,
                    content=chunk['content'],
                    embedding=embedding,
                    metadata=chunk['metadata']
                )
                stored_chunks.append(result)
            
            return {
                'stored_chunks': len(stored_chunks),
                'status': 'success',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error processing knowledge base: {str(e)}")
            raise
    
    def _prepare_chunks(self, processed_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Prepare data chunks for embedding"""
        chunks = []
        
        for sheet_name, sheet_data in processed_data['processed_data'].items():
            for chunk in sheet_data:
                # Convert DataFrame to text
                content = self._dataframe_to_text(
                    chunk['data'], 
                    sheet_name=sheet_name
                )
                
                # Create chunk with metadata
                chunks.append({
                    'content': content,
                    'metadata': {
                        'sheet_name': sheet_name,
                        'original_metadata': chunk['metadata'],
                        'relationships': chunk['relationships']
                    }
                })
        
        return chunks
    
    def _dataframe_to_text(self, df, sheet_name: str) -> str:
        """Convert DataFrame chunk to text format"""
        text_parts = [f"Sheet: {sheet_name}"]
        
        # Add column headers
        text_parts.append(f"Columns: {', '.join(df.columns)}")
        
        # Process each row
        for idx, row in df.iterrows():
            row_text = []
            for col in df.columns:
                value = row[col]
                if pd.notna(value):  # Check if value is not NaN
                    row_text.append(f"{col}: {value}")
            text_parts.append(" | ".join(row_text))
        
        return "\n".join(text_parts)
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI API"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            self.logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def _store_chunk(
        self, 
        project_id: int, 
        content: str, 
        embedding: List[float],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Store chunk with embedding in Supabase"""
        try:
            result = await supabase_manager.add_document(
                project_id=project_id,
                content=content,
                metadata=metadata,
                embedding=embedding
            )
            return result
        except Exception as e:
            self.logger.error(f"Error storing chunk: {str(e)}")
            raise
    
    async def search(
        self, 
        project_id: int, 
        query: str, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search knowledge base for relevant chunks"""
        try:
            # Generate query embedding
            query_embedding = await self._generate_embedding(query)
            
            # Search in Supabase
            results = await supabase_manager.query(
                project_id=project_id,
                query_text=query,
                query_embedding=query_embedding,
                top_k=limit
            )
            
            return results
        except Exception as e:
            self.logger.error(f"Error searching knowledge base: {str(e)}")
            raise 