import os
import json
import logging
from openai import AzureOpenAI
from logger import CustomLogger
from error_handler import AppError

logger = CustomLogger('openai_llm')

class OPENAILLMAPI:
    def __init__(self):
        self.configure_api()
        
    def configure_api(self):
        try:
            self.client = AzureOpenAI(
                api_key=os.environ.get('AZURE_API_KEY', "9ScmyYoI3Pnr1l96550vspRI58OoJe7b4VoVnIhUEdV9qB1ICkQCJQQJ99ALACYeBjFXJ3w3AAABACOGRRoa"),
                api_version=os.environ.get('AZURE_API_VERSION', "2024-02-15-preview"),
                azure_endpoint=os.environ.get('AZURE_ENDPOINT', "https://greencode-eastus.openai.azure.com")
            )
            if not self.client.api_key:
                logger.error("Azure OpenAI API key not found")
                raise AppError("Azure OpenAI API key not configured", status_code=500)
        except Exception as e:
            logger.error(f"Error configuring Azure OpenAI API: {str(e)}")
            raise AppError(f"Error configuring Azure OpenAI API: {str(e)}", status_code=500)

    def get_ai_response(self, prompt, relevant_data):
        logger.info("Processing AI response", {
            'prompt_length': len(prompt),
            'data_length': len(relevant_data)
        })
        
        try:
            system_message = """You are an expert data analyst. Format your entire response as a JSON string. Your response must be exactly in this format:
{
    "Answer": "Your detailed analysis here",
    "Dashboard": []
}

The Dashboard array should contain visualization objects when appropriate, each with this structure:
{
    "Name": "string",
    "Type": "one of: BarChart, LineChart, DoubleBarChart, MulticolorLineChart, PieChart, DonutChart, ScatterPlot, Histogram, Table",
    "is_prediction": boolean,
    "X_axis_label": "string",
    "Y_axis_label": "string",
    "X_axis_data": ["array of strings"],
    "Y_axis_data": [array of numbers],
    "Y_axis_data_secondary": [array of numbers],
    "Forecasted_X_axis_data": ["array of strings"],
    "Forecasted_Y_axis_data": [array of numbers],
    "Labels": ["array of strings"],
    "Values": [array of numbers],
    "Column_headers": ["array of strings"],
    "Row_data": [["array", "of"], ["string", "arrays"]]
}

Important: Your entire response must be a valid JSON string. Do not include any text or explanation outside of the JSON structure."""

            full_prompt = f"{relevant_data}\n\nQuestion: {prompt}"
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.2,
                max_tokens=3000,  # Adjust if needed
                n=1,
                top_p=1
            )
            
            # Get the response content and log it for debugging
            response_text = response.choices[0].message.content.strip()
            logger.info(f"Raw API Response: {response_text[:500]}...")  # Log first 500 chars
            
            # Try to parse the JSON response
            try:
                response_json = json.loads(response_text)
                
                # Validate response structure
                if not isinstance(response_json, dict):
                    logger.error("Response is not a dictionary")
                    raise ValueError("Invalid response structure - not a dictionary")
                    
                if 'Answer' not in response_json or 'Dashboard' not in response_json:
                    logger.error("Missing required keys in response")
                    raise ValueError("Invalid response structure - missing required keys")
                    
                if not isinstance(response_json['Dashboard'], list):
                    logger.error("Dashboard is not an array")
                    raise ValueError("Invalid response structure - Dashboard is not an array")
                
                logger.info("AI response validated successfully")
                return response_text
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON Decode Error: {str(e)}\nResponse text: {response_text}")
                raise AppError(f"Invalid JSON response from AI: {str(e)}")
            except ValueError as e:
                logger.error(f"Validation Error: {str(e)}\nResponse text: {response_text}")
                raise AppError(f"Invalid response structure from AI: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error in Azure OpenAI API call: {str(e)}")
            raise AppError(f"Error processing AI response: {str(e)}")

    def process_query(self, relevant_data, query):
        logger.info("Processing query", {'query': query})
        try:
            response = self.get_ai_response(query, relevant_data)
            response_json = json.loads(response)
            dashboard_data = response_json.get('Dashboard', [])  # Changed to [] as default
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
    llm_api = OPENAILLMAPI()
    
    try:
        # Test the API
        response = llm_api.process_query(test_data, test_query)
        print(response)
    except Exception as e:
        print(f"Error occurred: {str(e)}")
