from typing import List, Dict, Any
from .base_agent import BaseAgent
from .knowledge_base_agent import KnowledgeBaseAgent

class RetrievalAgent(BaseAgent):
    def __init__(self):
        super().__init__('retrieval')
        self.kb_agent = KnowledgeBaseAgent()
        self.max_results = self.config.get('max_results', 5)
        self.similarity_threshold = self.config.get('similarity_threshold', 0.7)
        self.context_window_size = self.config.get('context_window_size', 3)
    
    async def process(
        self, 
        project_id: int, 
        query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Retrieve relevant information based on query"""
        try:
            # Get relevant chunks from knowledge base
            relevant_chunks = await self.kb_agent.search(
                project_id=project_id,
                query=query,
                limit=self.max_results
            )
            
            # Enhance context with conversation history
            enhanced_context = self._enhance_context(
                relevant_chunks,
                conversation_history
            )
            
            # Format context for LLM
            formatted_context = self._format_context(enhanced_context)
            
            return {
                'context': formatted_context,
                'chunks': relevant_chunks,
                'enhanced_with_history': bool(conversation_history)
            }
            
        except Exception as e:
            self.logger.error(f"Error in retrieval process: {str(e)}")
            raise
    
    def _enhance_context(
        self, 
        chunks: List[Dict[str, Any]], 
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Enhance retrieved chunks with conversation context"""
        enhanced_context = {
            'chunks': chunks,
            'history_context': []
        }
        
        if conversation_history:
            # Get recent conversation context
            recent_history = conversation_history[-self.context_window_size:]
            enhanced_context['history_context'] = recent_history
        
        return enhanced_context
    
    def _format_context(self, enhanced_context: Dict[str, Any]) -> str:
        """Format context for LLM consumption"""
        formatted_parts = []
        
        # Add relevant chunks
        formatted_parts.append("Relevant Information:")
        for chunk in enhanced_context['chunks']:
            formatted_parts.append(f"- {chunk['content']}")
        
        # Add conversation history if available
        if enhanced_context['history_context']:
            formatted_parts.append("\nRecent Conversation Context:")
            for message in enhanced_context['history_context']:
                role = message.get('role', 'user')
                content = message.get('content', '')
                formatted_parts.append(f"{role}: {content}")
        
        return "\n".join(formatted_parts) 