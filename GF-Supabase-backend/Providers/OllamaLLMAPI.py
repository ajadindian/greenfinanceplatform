import ollama
import json
import logging
from logger import CustomLogger
from error_handler import AppError

logger = CustomLogger('ollama_llm')

class OllamaLLMAPI:
    def __init__(self, model_name='llama3.1'):
        """Initialize Ollama API with specified model."""
        self.model_name = model_name
        self._ensure_model_available()

    def _ensure_model_available(self):
        """Ensure the specified model is available locally."""
        try:
            ollama.show(self.model_name)
        except Exception as e:
            logger.warning(f"Model {self.model_name} not found, attempting to pull it")
            try:
                ollama.pull(self.model_name)
            except Exception as pull_error:
                logger.error(f"Failed to pull model: {str(pull_error)}")
                raise AppError(f"Failed to initialize model {self.model_name}", status_code=500)

    def get_ai_response(self, prompt, relevant_data):
        """Get AI response using Ollama."""
        logger.info("Processing AI response", {
            'prompt_length': len(prompt),
            'data_length': len(relevant_data)
        })
        
        try:
            # Create the system prompt with JSON schema
            system_prompt = """You are an expert data analyst. You will be provided with some construction project management data on which you may be asked to analyze. 

Your response must strictly follow this JSON schema:
{
    "type": "object",
    "properties": {
        "Answer": {
            "type": "string",
            "description": "Answer to the user query"
        },
        "Dashboard": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "Name": {
                        "type": "string",
                        "description": "Name of the visualization"
                    },
                    "Type": {
                        "type": "string",
                        "enum": [
                            "BarChart",
                            "LineChart",
                            "DoubleBarChart",
                            "MulticolorLineChart",
                            "PieChart",
                            "DonutChart",
                            "ScatterPlot",
                            "Histogram",
                            "Table"
                        ]
                    },
                    "is_prediction": {
                        "type": "boolean"
                    },
                    "X_axis_label": { "type": "string" },
                    "Y_axis_label": { "type": "string" },
                    "X_axis_data": {
                        "type": "array",
                        "items": { "type": "string" }
                    },
                    "Y_axis_data": {
                        "type": "array",
                        "items": { "type": "number" }
                    },
                    "Y_axis_data_secondary": {
                        "type": "array",
                        "items": { "type": "number" }
                    },
                    "Forecasted_X_axis_data": {
                        "type": ["array", "null"],
                        "items": { "type": "string" }
                    },
                    "Forecasted_Y_axis_data": {
                        "type": ["array", "null"],
                        "items": { "type": "number" }
                    },
                    "Labels": {
                        "type": "array",
                        "items": { "type": "string" }
                    },
                    "Values": {
                        "type": "array",
                        "items": { "type": "number" }
                    },
                    "Column_headers": {
                        "type": "array",
                        "items": { "type": "string" }
                    },
                    "Row_data": {
                        "type": "array",
                        "items": {
                            "type": "array",
                            "items": { "type": "string" }
                        }
                    }
                },
                "required": [
                    "Name",
                    "Type",
                    "is_prediction"
                ]
            }
        }
    },
    "required": ["Answer", "Dashboard"]
}

When responding:
- Understand the user's question and the data provided
- If a forecast is required, set is_prediction to true and use DoubleBarChart or MulticolorLineChart
- If no forecast is required, set is_prediction to false
- Focus on providing a data-oriented response with figures and insights
- Use markdown formatting in your Answer - enclose headers in ** and use \n for newlines
- The Dashboard should contain 2-3 relevant visualizations or be an empty array if none needed
- For charts, provide all required axis data and labels
- For tables, provide all column headers and row data
- Do not include data outside the scope of what was provided
- Do not make assumptions when forecasting - ask for clarification if needed
"""

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
            print(response)
            logger.info("AI response received successfully")
            return response['message']['content']
            
        except Exception as e:
            logger.error(f"Error in Ollama API call: {str(e)}", {
                'error_type': type(e).__name__
            })
            raise AppError(f"Error processing AI response: {str(e)}")

    def process_query(self, relevant_data, query):
        """Process a query and return the response."""
        logger.info("Processing query", {'query': query})
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
    # Sample test data (simulating construction project data)
    test_data = """
    Project Data:
    Project ID, Cost, Duration (months), Status
    P001, 500000, 6, Completed
    P002, 750000, 8, In Progress
    P003, 1200000, 12, Planning
    P004, 300000, 4, Completed
    """
    
    # Sample query
    test_query = "What are the top 3 projects by cost?"
    
    # Initialize the API
    llm_api = OllamaLLMAPI()
    
    try:
        # Test the API
        response = llm_api.process_query(test_data, test_query)
        print(json.dumps(json.loads(response), indent=2))
    except Exception as e:
        print(f"Error occurred: {str(e)}") 