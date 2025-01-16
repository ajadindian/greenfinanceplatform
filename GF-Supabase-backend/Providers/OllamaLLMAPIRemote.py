import ollama
import json
import logging
from logger import CustomLogger
from error_handler import AppError
import requests

logger = CustomLogger('ollama_llm')

class OllamaLLMAPIRemote:
    def __init__(self, model_name='llama3.1', host='http://localhost:11434'):
        """
        Initialize Ollama API with specified model and host.
        
        Args:
            model_name (str): Name of the model to use
            host (str): Host URL where Ollama is running (e.g., 'http://192.168.1.100:11434')
        """
        self.model_name = model_name
        self.host = host
        # Configure ollama to use the specified host
        ollama.BASE_URL = self.host
        self._ensure_model_available()

    def _ensure_model_available(self):
        """Ensure the specified model is available on the remote host."""
        try:
            response = requests.get(f"{self.host}/api/tags")
            available_models = response.json().get('models', [])
            model_exists = any(model.get('name') == self.model_name for model in available_models)
            
            if not model_exists:
                logger.warning(f"Model {self.model_name} not found, attempting to pull it")
                try:
                    ollama.pull(self.model_name)
                except Exception as pull_error:
                    logger.error(f"Failed to pull model: {str(pull_error)}")
                    raise AppError(f"Failed to initialize model {self.model_name}", status_code=500)
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to connect to Ollama server at {self.host}: {str(e)}")
            raise AppError(f"Failed to connect to Ollama server: {str(e)}", status_code=503)

    def get_ai_response(self, prompt, relevant_data):
        """Get AI response using Ollama."""
        logger.info("Processing AI response", {
            'prompt_length': len(prompt),
            'data_length': len(relevant_data),
            'host': self.host
        })
        
        try:
            # System prompt remains the same as in your original code
            system_prompt = """You are an expert data analyst..."""  # Your existing system prompt here

            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"{relevant_data}\n\nQuestion: {prompt}\n\nAnswer:"
                }
            ]

            # Make the API call with format=json to ensure JSON output
            response = ollama.chat(
                model=self.model_name,
                messages=messages,
                format='json',
                options={
                    "temperature": 0.2,
                    "num_ctx": 4096
                }
            )
            
            logger.info("AI response received successfully from remote host")
            return response['message']['content']
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error in Ollama API call: {str(e)}", {
                'error_type': type(e).__name__,
                'host': self.host
            })
            raise AppError(f"Network error in AI response: {str(e)}")
        except Exception as e:
            logger.error(f"Error in Ollama API call: {str(e)}", {
                'error_type': type(e).__name__,
                'host': self.host
            })
            raise AppError(f"Error processing AI response: {str(e)}")

    def process_query(self, relevant_data, query):
        """Process a query and return the response."""
        logger.info("Processing query", {'query': query, 'host': self.host})
        try:
            response = self.get_ai_response(query, relevant_data)
            response_json = json.loads(response)
            dashboard_data = response_json.get('Dashboard', {})
            logger.info("Query processed successfully")
            return response
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            raise

if __name__ == "__main__":
    # Sample test with remote host
    test_data = """
    Project Data:
    Project ID, Cost, Duration (months), Status
    P001, 500000, 6, Completed
    P002, 750000, 8, In Progress
    P003, 1200000, 12, Planning
    P004, 300000, 4, Completed
    """
    
    test_query = "What are the top 3 projects by cost?"
    
    # Initialize the API with remote host
    llm_api = OllamaLLMAPIRemote(host='http://192.168.1.100:11434')  # Replace with your actual host IP
    
    try:
        # Test the API
        response = llm_api.process_query(test_data, test_query)
        print(json.dumps(json.loads(response), indent=2))
    except Exception as e:
        print(f"Error occurred: {str(e)}")