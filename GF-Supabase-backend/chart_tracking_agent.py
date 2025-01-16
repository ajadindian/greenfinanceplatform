from logger import CustomLogger
from database import db
from supabase_manager import supabase_manager
from Providers.OPENAILLMAPI import OPENAILLMAPI
import json
import logging
import datetime

logger = CustomLogger('chart_tracking')

class ChartTrackingAgent:
    def __init__(self):
        self.openai_llm = OPENAILLMAPI()
        
    def _create_update_prompt(self, chart_data, project_data):
        """Create a dynamic prompt for updating chart values"""
        prompt = f"""
You are a data visualization expert. You need to update an existing chart with new data while maintaining its original structure and type.

Original Chart Configuration:
{json.dumps(chart_data, indent=2)}

New Project Data:
{project_data}

Requirements:
1. Keep the same chart type, name, and structure
2. Update only the numerical values and data points
3. Maintain the same format for X and Y axis data
4. If the chart is a prediction chart (is_prediction=true), recalculate predictions based on new data
5. Return the updated chart configuration in exactly the same JSON format

Please update the chart values while keeping all other properties unchanged.
"""
        return prompt

    def _update_chart_values(self, original_chart, updated_data):
        """Compare and update chart values while maintaining structure"""
        try:
            # Get the first dashboard item from updated data (assuming it's the primary chart)
            new_chart = json.loads(updated_data)['Dashboard'][0]
            
            # Create a copy of the original chart data
            updated_chart = original_chart.copy()
            chart_data = updated_chart['chart_data']
            
            # Update common fields that might change
            fields_to_update = [
                'X_axis_data', 'Y_axis_data', 'Y_axis_data_secondary',
                'Forecasted_X_axis_data', 'Forecasted_Y_axis_data',
                'Labels', 'Values', 'Column_headers', 'Row_data'
            ]
            
            for field in fields_to_update:
                if field in new_chart and new_chart[field] != chart_data.get(field):
                    logger.info(f"Updating {field} for chart")
                    chart_data[field] = new_chart[field]
            
            # Update last_updated timestamp
            updated_chart['last_updated'] = datetime.datetime.utcnow().isoformat()
            
            return updated_chart
            
        except Exception as e:
            logger.error(f"Error updating chart values: {str(e)}")
            raise

    def update_project_charts(self, project_id):
        """Update all saved charts for a project with new data"""
        try:
            # Get all saved charts for the project
            charts = db.get_project_charts(project_id)
            if not charts:
                logger.info(f"No charts found for project {project_id}")
                return

            # Get latest project data using Supabase
            latest_data = supabase_manager.query(
                project_id=project_id,
                query_text="all project data",
                top_k=50
            )

            # Combine all relevant data
            project_data = "\n".join([doc['content'] for doc in latest_data])

            updated_charts = []
            for chart in charts:
                try:
                    logger.info(f"Updating chart {chart.doc_id} for project {project_id}")
                    
                    # Create prompt for this specific chart
                    prompt = self._create_update_prompt(chart, project_data)
                    response = self.openai_llm.get_ai_response(prompt, project_data)
                    
                    # Update chart with new values while maintaining structure
                    updated_chart = self._update_chart_values(chart, response)
                    
                    # Save the updated chart
                    success = db.update_chart(project_id, chart.doc_id, updated_chart)
                    
                    if success:
                        logger.info(f"Successfully updated chart {chart.doc_id}")
                        updated_charts.append(updated_chart)
                    else:
                        logger.error(f"Failed to update chart {chart.doc_id}")

                except Exception as e:
                    logger.error(f"Error updating chart {chart.doc_id}: {str(e)}")
                    continue

            return updated_charts

        except Exception as e:
            logger.error(f"Error in chart update process: {str(e)}")
            raise