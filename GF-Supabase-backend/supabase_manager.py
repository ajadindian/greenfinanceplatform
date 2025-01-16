from supabase import create_client, Client
import os
import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Union
import pandas as pd
from logger import CustomLogger
from error_handler import AppError

logger = CustomLogger('supabase')

class SupabaseManager:
    def __init__(self):
        logger.info("Initializing Supabase connection")
        #self.supabase_url = os.environ.get('SUPABASE_URL')
        self.supabase_url = "https://qnhhmzmmjoxhlbeopshv.supabase.co"    #"https://wlyqzujgfpqybjckpqfz.supabase.co"
        self.supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaGhtem1tam94aGxiZW9wc2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3OTI0NzMsImV4cCI6MjA1MjM2ODQ3M30.oSYt9cSYehlmW6Ky3pHy6pLQUIEqUetL5ZeKWe7-Ous"     #"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseXF6dWpnZnBxeWJqY2twcWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NTIzMjksImV4cCI6MjA1MjQyODMyOX0._tZQUux1XwnsKR16tFPUubIEztobkeHPj1tmf-pvNXs"
        if not self.supabase_url or not self.supabase_key:
            logger.error("Supabase credentials not found")
            raise AppError("Supabase credentials not configured")
            
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize database tables if they don't exist
        self._init_database()
        self.text_cache = {}  # Add cache for incremental processing
        logger.info("Supabase initialization complete")

    def _init_database(self):
        """Initialize the necessary tables in Supabase"""
        try:
            # Update vector dimension to match the new model (384 for all-MiniLM-L6-v2)
            self.supabase.postgrest.rpc(
                'exec_sql',
                {
                    'query': """
                    CREATE EXTENSION IF NOT EXISTS vector;
                    
                    CREATE TABLE IF NOT EXISTS documents (
                        id BIGSERIAL PRIMARY KEY,
                        project_id BIGINT,
                        content TEXT,
                        embedding vector(384),
                        metadata JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
                    );
                    
                    CREATE INDEX IF NOT EXISTS documents_embedding_idx 
                    ON documents 
                    USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100);
                    
                    -- Update the match_documents function
                    CREATE OR REPLACE FUNCTION match_documents(
                        query_embedding vector(384),
                        query_text text,
                        project_id bigint,
                        match_count int DEFAULT 5
                    )
                    RETURNS TABLE (
                        id bigint,
                        content text,
                        similarity float,
                        metadata jsonb
                    )
                    LANGUAGE plpgsql
                    AS $$
                    BEGIN
                        RETURN QUERY
                        SELECT
                            d.id,
                            d.content,
                            (1 - (d.embedding <=> query_embedding)) * 0.7 + 
                            ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) * 0.3 
                            as similarity,
                            d.metadata
                        FROM
                            documents d
                        WHERE
                            d.project_id = match_documents.project_id
                        ORDER BY
                            similarity DESC
                        LIMIT match_count;
                    END;
                    $$;
                    """
                }
            ).execute()
            logging.info("Database initialized successfully")
        except Exception as e:
            logging.error(f"Error initializing database: {str(e)}")
            # Continue even if table already exists
            pass

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding using sentence-transformers"""
        # Generate embedding and convert to list of floats
        embedding = self.embedding_model.encode(text)
        return embedding.tolist()

    def add_document(self, project_id: int, content: str, metadata: Dict[str, Any] = None):
        """Add a document to the vector store"""
        logger.info(f"Adding document for project {project_id}", {
            'content_length': len(content),
            'has_metadata': metadata is not None
        })
        
        try:
            # Generate embedding
            embedding = self.get_embedding(content)
            
            # Insert document with embedding
            data = {
                "project_id": project_id,
                "content": content,
                "embedding": embedding,
                "metadata": metadata or {}
            }
            
            result = self.supabase.table("documents").insert(data).execute()
            logger.info(f"Document added successfully to project {project_id}")
            return result.data
            
        except Exception as e:
            logger.error(f"Error adding document: {str(e)}", {
                'project_id': project_id
            })
            raise

    def query(self, project_id: int, query_text: str, top_k: int = 5):
        """Query documents using hybrid search"""
        try:
            # Get query embedding
            query_embedding = self.get_embedding(query_text)
            
            # Perform hybrid search using both vector similarity and full-text search
            result = self.supabase.rpc(
                'match_documents',
                {
                    'query_embedding': query_embedding,
                    'query_text': query_text,
                    'project_id': project_id,
                    'match_count': top_k
                }
            ).execute()
            
            # Filter out duplicates based on content
            unique_results = {}
            for doc in result.data:
                unique_results[doc['content']] = doc
            
            return list(unique_results.values())
            
        except Exception as e:
            logging.error(f"Error querying documents: {str(e)}")
            raise

    def delete_project_documents(self, project_id: int):
        """Delete all documents for a project"""
        try:
            self.supabase.table("documents").delete().eq("project_id", project_id).execute()
        except Exception as e:
            logging.error(f"Error deleting project documents: {str(e)}")
            raise

    def _process_structured_data(self, content: Dict[str, list]) -> str:
        """Process structured data (like Excel) to extract key relationships"""
        processed_text = []
        
        for sheet_name, data in content.items():
            sheet_text = f"Sheet: {sheet_name}\n"
            
            # Extract column headers and their relationships
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                
                # Add column relationships
                for row in data:
                    row_text = []
                    for header in headers:
                        if row.get(header):
                            row_text.append(f"{header}: {row[header]}")
                    processed_text.append(f"{sheet_text}{'| '.join(row_text)}")

        return "\n".join(processed_text)

    def process_excel_file(self, file_path: str) -> Dict[str, list]:
        """Process Excel file and return structured content"""
        try:
            excel_data = {}
            # Read all sheets
            xlsx = pd.ExcelFile(file_path)
            
            for sheet_name in xlsx.sheet_names:
                df = pd.read_excel(xlsx, sheet_name)
                # Convert DataFrame to list of dictionaries
                excel_data[sheet_name] = df.to_dict('records')
            
            return excel_data
            
        except Exception as e:
            logging.error(f"Error processing Excel file: {str(e)}")
            raise

    def add_document_incremental(self, project_id: int, content: Union[str, Dict], metadata: Dict[str, Any] = None):
        """Add document with support for incremental processing"""
        try:
            # Initialize project cache if not exists
            if project_id not in self.text_cache:
                self.text_cache[project_id] = []

            # Process structured data if content is a dictionary
            if isinstance(content, dict):
                processed_content = self._process_structured_data(content)
            else:
                processed_content = content

            # Add to cache
            self.text_cache[project_id].append(processed_content)
            
            # Combine all cached content for the project
            full_content = "\n\n".join(self.text_cache[project_id])
            
            # Add to database
            return self.add_document(project_id, full_content, metadata)
            
        except Exception as e:
            logging.error(f"Error in incremental document addition: {str(e)}")
            raise

    def process_and_add_excel(self, project_id: int, file_path: str, metadata: Dict[str, Any] = None):
        """Process Excel file and add its content to the database"""
        try:
            # Process Excel file
            excel_data = self.process_excel_file(file_path)
            
            # Add processed data incrementally
            return self.add_document_incremental(project_id, excel_data, metadata)
            
        except Exception as e:
            logging.error(f"Error processing and adding Excel file: {str(e)}")
            raise

    def clear_cache(self, project_id: int = None):
        """Clear the text cache for a specific project or all projects"""
        if project_id is not None:
            self.text_cache.pop(project_id, None)
        else:
            self.text_cache.clear()

    def delete_file(self, project_id: int, file_path: str) -> bool:
        """Delete a file from Supabase Storage"""
        try:
            # Create metadata dictionary with normalized file path
            metadata = {
                'file_path': file_path.replace('\\', '/')
            }
            
            # Delete associated document metadata and embeddings using the ->> operator
            self.supabase.table("documents").delete().eq("project_id", project_id).eq("metadata->>file_path", metadata['file_path']).execute()
            
            logging.info(f"Successfully deleted file metadata for project {project_id}")
            return True
            
        except Exception as e:
            logging.error(f"Error deleting file: {str(e)}")
            return False

supabase_manager = SupabaseManager() 

if __name__ == "__main__":
    try:
        # Add a test document
        test_project_id = 1
        test_content = "This is a test document about artificial intelligence and machine learning."
        test_metadata = {"source": "test", "type": "verification"}
        
        # Add the document
        result = supabase_manager.add_document(
            project_id=test_project_id,
            content=test_content,
            metadata=test_metadata
        )
        print("Document added successfully")
        
        # Query the document
        query_text = "artificial intelligence"
        search_results = supabase_manager.query(
            project_id=test_project_id,
            query_text=query_text,
            top_k=5
        )
        
        print("\nSearch results:")
        for idx, doc in enumerate(search_results, 1):
            print(f"\nResult {idx}:")
            print(f"Content: {doc['content']}")
            print(f"Similarity Score: {doc['similarity']:.4f}")
            print(f"Metadata: {doc['metadata']}")

    except Exception as e:
        print(f"Error during testing: {str(e)}")
