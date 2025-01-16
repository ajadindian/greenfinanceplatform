from tinydb import TinyDB, Query
import os
from datetime import datetime
import json
import logging
from logger import CustomLogger
from error_handler import NotFoundError, ValidationError
from werkzeug.security import check_password_hash, generate_password_hash

logger = CustomLogger('database')

class Database:
    def __init__(self):
        logger.info("Initializing database")
        # First initialize all TinyDB instances
        self.companies_db = TinyDB('companies.json')
        self.users_db = TinyDB('users.json')
        self.projects_db = TinyDB('projects.json')
        self.charts_db = TinyDB('charts.json')
        self.prompts_db = TinyDB('prompts.json')
        self.dashboard_layouts_db = TinyDB('dashboard_layouts.json')
        
        # Then initialize/validate the database files
        self._init_database_files()
        
        # Finally, update user settings if needed
        self._init_user_settings()
        
        logger.info("Database initialization complete")

    def _init_database_files(self):
        """Initialize database files with empty JSON if needed"""
        files = [
            'companies.json',
            'users.json',
            'projects.json',
            'charts.json',
            'prompts.json',
            'dashboard_layouts.json'
        ]
        
        for filename in files:
            try:
                with open(filename, 'r') as f:
                    try:
                        json.load(f)
                    except json.JSONDecodeError:
                        logger.warning(f"Corrupted database file: {filename}, reinitializing")
                        with open(filename, 'w') as f:
                            json.dump({}, f)
            except FileNotFoundError:
                logger.info(f"Creating new database file: {filename}")
                with open(filename, 'w') as f:
                    json.dump({}, f)

    def _init_user_settings(self):
        """Initialize default settings for users"""
        try:
            for user in self.users_db.all():
                if 'settings' not in user or not user['settings']:
                    default_settings = {
                        'display_name': user.get('name', ''),
                        'notifications_enabled': True,
                        'theme_preference': 'light'
                    }
                    self.users_db.update({
                        'settings': default_settings
                    }, doc_ids=[user.doc_id])
                    logger.info(f"Initialized settings for user {user.doc_id}")
        except Exception as e:
            logger.error(f"Error initializing user settings: {str(e)}")

    def get_company(self, company_id):
        """Get company data with settings initialization"""
        company = self.companies_db.get(doc_id=int(company_id))
        if company and 'settings' not in company:
            # Initialize default settings
            default_settings = {
                'display_name': company.get('name', ''),
                'notifications_enabled': True,
                'theme_preference': 'light'
            }
            self.companies_db.update({
                'settings': default_settings
            }, doc_ids=[company_id])
            company['settings'] = default_settings
        return company

    def get_user(self, user_id):
        return self.users_db.get(doc_id=int(user_id))

    def get_project(self, project_id):
        try:
            return self.projects_db.get(doc_id=int(project_id))
        except (json.JSONDecodeError, ValueError) as e:
            logging.error(f"Error reading project {project_id}: {str(e)}")
            return None

    def get_company_projects(self, company_id):
        Project = Query()
        return self.projects_db.search(Project.company_id == company_id)

    def get_user_projects(self, user_id):
        Project = Query()
        return self.projects_db.search(Project.assigned_users.any([user_id]))

    def company_exists_by_email(self, email):
        Company = Query()
        return self.companies_db.contains(Company.email == email)

    def company_exists_by_name(self, name):
        Company = Query()
        return self.companies_db.contains(Company.name == name)

    def create_company(self, company_data):
        return self.companies_db.insert(company_data)

    def get_company_by_email(self, email):
        Company = Query()
        result = self.companies_db.get(Company.email == email)
        if result:
            result['id'] = result.doc_id  # Add the document ID to the result
        return result

    def user_exists_by_email(self, email):
        User = Query()
        return self.users_db.contains(User.email == email)

    def create_user(self, user_data):
        return self.users_db.insert(user_data)

    def get_user_by_email(self, email):
        User = Query()
        return self.users_db.get(User.email == email)

    def get_all_companies(self):
        return self.companies_db.all()

    def create_project(self, project_data):
        return self.projects_db.insert(project_data)

    def get_project_files(self, project_id):
        project = self.get_project(project_id)
        if not project or 'path' not in project:
            return []

        metadata_path = os.path.join(project['path'], 'files_metadata')
        metadata_file = os.path.join(metadata_path, 'files_metadata.json')
        
        # Load existing metadata
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                try:
                    metadata = json.load(f)
                except json.JSONDecodeError:
                    print("\nError decoding metadata file")
                    metadata = {}
        else:
            print("\nNo metadata file exists")
            metadata = {}

        files_list = []
        file_id = 1

        for root, dirs, files in os.walk(project['path']):
            if 'RAG_cache' in root or 'files_metadata' in root:
                continue

            for file in files:
                file_path = os.path.join(root, file)
                file_stat = os.stat(file_path)
                rel_path = os.path.relpath(root, project['path'])
                
                # Get the original filename from metadata or extract it
                file_identifier = f"{rel_path}_{file}"
                file_metadata = metadata.get(file_identifier, {})
                
                # Extract original filename by removing timestamp prefix
                original_filename = file
                if '_' in file and len(file.split('_', 1)) == 2:
                    time_part, name_part = file.split('_', 1)
                    if len(time_part) == 8 and time_part.replace('-', '').isdigit():
                        original_filename = name_part

                # Get the proper date from metadata or use file system date
                date_added = file_metadata.get('dateAdded')
                if not date_added:
                    date_added = datetime.fromtimestamp(file_stat.st_ctime).strftime('%Y-%m-%d')

                # Format the last updated date
                last_updated = datetime.fromtimestamp(file_stat.st_mtime).strftime('%Y-%m-%d')

                files_list.append({
                    "id": file_id,
                    "name": original_filename,  # Use the extracted original filename
                    "path": file_path,
                    "relative_path": rel_path,
                    "addedBy": file_metadata.get('addedBy', 'System'),
                    "dateAdded": date_added,
                    "lastUpdated": last_updated,
                    "size": file_stat.st_size
                })
                file_id += 1

        return files_list

    def delete_project_file(self, project_id, file_id):
        project = self.get_project(project_id)
        if not project:
            return False

        files = self.get_project_files(project_id)
        file_to_delete = next((f for f in files if f['id'] == file_id), None)
        
        if not file_to_delete:
            return False
        
        try:
            # Delete the actual file
            if os.path.exists(file_to_delete['path']):
                os.remove(file_to_delete['path'])
                
            # Delete metadata entry
            metadata_path = os.path.join(project['path'], 'files_metadata')
            metadata_file = os.path.join(metadata_path, 'files_metadata.json')
            
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    try:
                        metadata = json.load(f)
                    except json.JSONDecodeError:
                        metadata = {}
                        
                # Create the file identifier
                file_identifier = f"{file_to_delete['relative_path']}_{file_to_delete['name']}"
                
                # Remove the file's metadata if it exists
                if file_identifier in metadata:
                    del metadata[file_identifier]
                    
                # Save updated metadata
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=4)
                    
            # Clean up empty directories
            dir_path = os.path.dirname(file_to_delete['path'])
            if os.path.exists(dir_path) and not os.listdir(dir_path):
                try:
                    os.rmdir(dir_path)
                except OSError:
                    pass  # Ignore if directory cannot be removed
                
            return True
            
        except (OSError, IOError) as e:
            logging.error(f"Error deleting file: {str(e)}")
            return False

    def get_project_file(self, project_id, file_id):
        files = self.get_project_files(project_id)
        return next((f for f in files if f['id'] == file_id), None)

    def save_file_metadata(self, project_id, file_info):
        logger.info(f"Saving file metadata for project {project_id}", {
            'file_name': file_info.get('name'),
            'relative_path': file_info.get('relative_path')
        })
        
        try:
            project = self.get_project(project_id)
            if not project:
                logger.error(f"Project not found: {project_id}")
                return False

            metadata_path = os.path.join(project['path'], 'files_metadata')
            metadata_file = os.path.join(metadata_path, 'files_metadata.json')
            
            os.makedirs(metadata_path, exist_ok=True)
            
            # Load existing metadata
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    try:
                        metadata = json.load(f)
                    except json.JSONDecodeError:
                        metadata = {}
            else:
                metadata = {}
            
            # Create a unique identifier for the file
            file_identifier = f"{file_info['relative_path']}_{file_info['name']}"
            
            # If this is an update, remove the old metadata entry
            if file_info.get('isUpdate'):
                original_name = file_info['name'].split('_', 1)[1] if '_' in file_info['name'] else file_info['name']
                old_entries = [k for k in metadata.keys() 
                              if k.endswith(original_name) and k != file_identifier]
                for old_entry in old_entries:
                    metadata.pop(old_entry, None)
            
            # Store metadata with all necessary information
            metadata[file_identifier] = {
                "dateAdded": file_info['dateAdded'],
                "addedBy": file_info['addedBy'],
                "originalName": file_info['name']
            }
            
            # Save updated metadata
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=4)
            
            logger.info("File metadata saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error saving file metadata: {str(e)}", {
                'project_id': project_id,
                'file_name': file_info.get('name')
            })
            return False

    def create_charts_table(self):
        """Initialize the charts table in the database"""
        self.charts_db = TinyDB('charts.json')

    def save_chart(self, project_id, chart_data):
        """Save a chart for a project"""
        try:
            chart = {
                'project_id': project_id,
                'name': chart_data['name'],
                'query': chart_data['query'],
                'chart_data': chart_data['chart_data'],
                'created_at': datetime.now().isoformat(),
                'created_by': chart_data.get('created_by'),
                'is_pinned': False  # Add default value for is_pinned
            }
            chart_id = self.charts_db.insert(chart)
            return chart_id
        except Exception as e:
            logger.error(f"Error saving chart: {str(e)}")
            return None

    def get_project_charts(self, project_id):
        """Get all charts for a project"""
        try:
            Chart = Query()
            charts = self.charts_db.search(Chart.project_id == project_id)
            return charts
        except Exception as e:
            logger.error(f"Error retrieving charts: {str(e)}")
            return []

    def delete_chart(self, project_id, chart_id):
        """Delete a chart from a project"""
        try:
            Chart = Query()
            self.charts_db.remove(
                (Chart.doc_id == chart_id) & 
                (Chart.project_id == project_id)
            )
            return True
        except Exception as e:
            logger.error(f"Error deleting chart: {str(e)}")
            return False

    def update_chart(self, project_id, chart_id, updated_data):
        """Update an existing chart with new data"""
        try:
            logger.info(f"Updating chart {chart_id} for project {project_id}")
            
            # Extract the first chart from Dashboard array if it exists
            new_chart_data = updated_data.get('Dashboard', [])[0] if updated_data.get('Dashboard') else None
            
            if not new_chart_data:
                logger.error("No valid chart data found in update")
                return False
            
            # Get the existing chart directly using doc_id
            existing_chart = self.charts_db.get(doc_id=int(chart_id))
            
            if not existing_chart:
                logger.error(f"Chart {chart_id} not found")
                return False
            
            # Verify this is the correct project
            if existing_chart.get('project_id') != project_id:
                logger.error(f"Chart {chart_id} does not belong to project {project_id}")
                return False
            
            # Update the chart_data field with new values while preserving structure
            updated_chart_data = existing_chart['chart_data']
            
            # Handle both 'Labels' and 'labels' cases
            if 'Labels' in new_chart_data:
                updated_chart_data['labels'] = new_chart_data['Labels']
            
            # Update values
            updated_chart_data['Values'] = new_chart_data['Values']
            updated_chart_data['X_axis_data'] = new_chart_data['X_axis_data']
            updated_chart_data['Y_axis_data'] = new_chart_data['Y_axis_data']
            updated_chart_data['Y_axis_data_secondary'] = new_chart_data['Y_axis_data_secondary']
            updated_chart_data['Forecasted_X_axis_data'] = new_chart_data['Forecasted_X_axis_data']
            updated_chart_data['Forecasted_Y_axis_data'] = new_chart_data['Forecasted_Y_axis_data']
            
            # Perform the update
            self.charts_db.update(
                {
                    'chart_data': updated_chart_data,
                    'last_updated': datetime.now().isoformat()
                },
                doc_ids=[int(chart_id)]
            )
            
            logger.info(f"Successfully updated chart {chart_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating chart: {str(e)}")
            return False

    def verify_chart_update(self, project_id, chart_id, expected_values):
        """Verify that the chart was updated correctly"""
        try:
            # Get the chart directly using doc_id instead of using Query
            chart = self.charts_db.get(doc_id=int(chart_id))
            
            if not chart:
                logger.error(f"Chart {chart_id} not found")
                return False
            
            # Compare values from chart_data
            current_values = chart.get('chart_data', {}).get('Values', [])
            if current_values != expected_values:
                logger.error(f"Chart values mismatch. Expected: {expected_values}, Got: {current_values}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying chart update: {str(e)}")
            return False

    def pin_chart(self, project_id, chart_id):
        """Pin a chart to the project dashboard"""
        try:
            # Get the chart directly using doc_id
            chart = self.charts_db.get(doc_id=int(chart_id))
            
            if not chart or chart['project_id'] != project_id:
                logger.error(f"Chart {chart_id} not found or doesn't belong to project {project_id}")
                return False
            
            # Update using doc_ids for more reliable updating
            self.charts_db.update(
                {'is_pinned': True},
                doc_ids=[int(chart_id)]
            )
            
            # Verify the update
            updated_chart = self.charts_db.get(doc_id=int(chart_id))
            if updated_chart and updated_chart.get('is_pinned'):
                logger.info(f"Successfully pinned chart {chart_id}")
                return True
            else:
                logger.error(f"Failed to verify pin update for chart {chart_id}")
                return False
            
        except Exception as e:
            logger.error(f"Error pinning chart: {str(e)}")
            return False

    def unpin_chart(self, project_id, chart_id):
        """Unpin a chart from the project dashboard"""
        try:
            Chart = Query()
            self.charts_db.update(
                {'is_pinned': False},
                (Chart.doc_id == chart_id) & (Chart.project_id == project_id)
            )
            return True
        except Exception as e:
            logger.error(f"Error unpinning chart: {str(e)}")
            return False

    def get_pinned_charts(self, project_id):
        """Get all pinned charts for a project"""
        try:
            Chart = Query()
            return self.charts_db.search(
                (Chart.project_id == project_id) & 
                (Chart.is_pinned == True)
            )
        except Exception as e:
            logger.error(f"Error retrieving pinned charts: {str(e)}")
            return []

    def save_dashboard_layout(self, project_id, layout_config):
        """Save a dashboard layout configuration with associated charts"""
        try:
            # Ensure required fields have default values
            layout = {
                'project_id': project_id,
                'name': layout_config['name'].strip(),
                'layout_data': layout_config.get('layout_data', {}),
                'charts': layout_config.get('charts', []),
                'created_at': datetime.now().isoformat()
            }
            
            # Don't validate layout structure if it's empty
            if layout['layout_data']:
                for breakpoint, items in layout['layout_data'].items():
                    for item in items:
                        if 'i' not in item or 'chartId' not in item:
                            logger.error("Invalid layout item structure")
                            return None

                # Only validate charts if there are any in the layout
                chart_ids = {item['chartId'] for items in layout['layout_data'].values() for item in items}
                for chart_id in chart_ids:
                    if not self.charts_db.get(doc_id=int(chart_id)):
                        logger.error(f"Referenced chart {chart_id} does not exist")
                        return None
            
            layout_id = self.dashboard_layouts_db.insert(layout)
            logger.info(f"Saved dashboard layout with ID: {layout_id}")
            return layout_id
            
        except Exception as e:
            logger.error(f"Error saving dashboard layout: {str(e)}")
            return None

    def get_dashboard_layouts(self, project_id):
        """Get all dashboard layouts with full chart data"""
        try:
            Layout = Query()
            layouts = self.dashboard_layouts_db.search(Layout.project_id == project_id)
            
            formatted_layouts = []
            for layout in layouts:
                try:
                    # Get full chart data for each chart
                    charts = []
                    chart_ids = set()  # Use a set to store unique chart IDs
                    
                    # Safely extract chart IDs from layout data
                    layout_data = layout.get('layout_data', {})
                    for breakpoint, items in layout_data.items():
                        if isinstance(items, list):
                            for item in items:
                                if isinstance(item, dict):
                                    # Try both 'chartId' and potential alternative keys
                                    chart_id = item.get('chartId') or item.get('chart_id') or item.get('i')
                                    if chart_id:
                                        try:
                                            chart_ids.add(int(chart_id))
                                        except (ValueError, TypeError):
                                            logger.warning(f"Invalid chart ID format: {chart_id}")
                                            continue
                    
                    # Get chart data for valid IDs
                    for chart_id in chart_ids:
                        chart = self.charts_db.get(doc_id=int(chart_id))
                        if chart:
                            charts.append({
                                'id': chart.doc_id,
                                'name': chart['name'],
                                'query': chart['query'],
                                'chart_data': chart['chart_data'],
                                'is_pinned': chart.get('is_pinned', False),
                                'created_at': chart.get('created_at'),
                                'created_by': chart.get('created_by')
                            })
                    
                    formatted_layouts.append({
                        'id': layout.doc_id,
                        'name': layout.get('name', ''),
                        'project_id': layout['project_id'],
                        'layout_data': layout_data,
                        'charts': charts,
                        'created_at': layout.get('created_at', datetime.now().isoformat())
                    })
                    
                except Exception as layout_error:
                    logger.error(f"Error processing layout {layout.doc_id}: {str(layout_error)}")
                    continue  # Skip this layout but continue processing others
            
            return formatted_layouts
            
        except Exception as e:
            logger.error(f"Error retrieving dashboard layouts: {str(e)}")
            return []

    def get_dashboard_layout(self, project_id, layout_id):
        """Get a specific dashboard layout with full chart data"""
        try:
            layout = self.dashboard_layouts_db.get(doc_id=int(layout_id))
            if not layout or layout['project_id'] != project_id:
                return None

            # Get full chart data for each chart
            charts = []
            chart_ids = {
                item['chartId'] 
                for items in layout['layout_data'].values() 
                for item in items
            }
            
            for chart_id in chart_ids:
                chart = self.charts_db.get(doc_id=int(chart_id))
                if chart:
                    charts.append({
                        'id': chart.doc_id,
                        'name': chart['name'],
                        'query': chart['query'],
                        'chart_data': chart['chart_data'],
                        'is_pinned': chart.get('is_pinned', False),
                        'created_at': chart.get('created_at'),
                        'created_by': chart.get('created_by')
                    })

            # Format the response according to frontend expectations
            return {
                'id': layout.doc_id,
                'name': layout['name'],
                'project_id': layout['project_id'],
                'layout_data': layout['layout_data'],
                'charts': charts,
                'created_at': layout['created_at']
            }
        except Exception as e:
            logger.error(f"Error retrieving dashboard layout: {str(e)}")
            return None

    def get_user_settings(self, user_id):
        """Get user settings with fallback to defaults"""
        user = self.get_user(user_id)
        if not user:
            return None
        
        # Ensure settings exist
        if 'settings' not in user or not user['settings']:
            default_settings = {
                'display_name': user.get('name', ''),
                'notifications_enabled': True,
                'theme_preference': 'light'
            }
            self.users_db.update({
                'settings': default_settings
            }, doc_ids=[user_id])
            user['settings'] = default_settings
        
        return {
            'email': user.get('email'),
            'display_name': user['settings'].get('display_name', user.get('name', '')),
            'notifications_enabled': user['settings'].get('notifications_enabled', True),
            'theme_preference': user['settings'].get('theme_preference', 'light')
        }

    def update_user_settings(self, user_id, settings):
        """Update user settings"""
        user = self.get_user(user_id)
        if not user:
            return False
        
        current_settings = user.get('settings', {})
        current_settings.update(settings)
        
        self.users_db.update({
            'settings': current_settings
        }, doc_ids=[user_id])
        
        return True

    def update_user_password(self, user_id, current_password, new_password):
        """Update user password"""
        user = self.get_user(user_id)
        if not user:
            return False
        
        if not check_password_hash(user['password'], current_password):
            return False
        
        self.users_db.update({
            'password': generate_password_hash(new_password)
        }, doc_ids=[user_id])
        
        return True

    def update_company_settings(self, company_id, settings):
        """Update company settings"""
        company = self.get_company(company_id)
        if not company:
            return False
        
        current_settings = company.get('settings', {})
        current_settings.update(settings)
        
        self.companies_db.update({
            'settings': current_settings
        }, doc_ids=[company_id])
        
        return True

    def update_company_password(self, company_id, current_password, new_password):
        """Update company password with current password verification"""
        company = self.get_company(company_id)
        if not company:
            return False
        
        try:
            # Verify current password
            if not check_password_hash(company['password'], current_password):
                logger.warning(f"Invalid current password attempt for company {company_id}")
                return False
            
            # Update to new password
            self.companies_db.update({
                'password': generate_password_hash(new_password)
            }, doc_ids=[company_id])
            
            logger.info(f"Successfully updated password for company {company_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating company password: {str(e)}")
            return False

    def save_prompt(self, project_id, prompt_data):
        """Save a prompt for a project"""
        try:
            prompt = {
                'project_id': project_id,
                'content': prompt_data['content'],
                'tags': prompt_data.get('tags', []),
                'created_at': datetime.now().isoformat(),
                'created_by': prompt_data.get('created_by')
            }
            
            prompt_id = self.prompts_db.insert(prompt)
            logger.info(f"Saved prompt with ID: {prompt_id}")
            return prompt_id
            
        except Exception as e:
            logger.error(f"Error saving prompt: {str(e)}")
            return None

    def get_project_prompts(self, project_id):
        """Get all prompts for a project"""
        try:
            Prompt = Query()
            prompts = self.prompts_db.search(Prompt.project_id == project_id)
            return [dict(prompt, id=prompt.doc_id) for prompt in prompts]
            
        except Exception as e:
            logger.error(f"Error retrieving prompts: {str(e)}")
            return []

    def delete_prompt(self, project_id, prompt_id):
        """Delete a prompt from a project"""
        try:
            Prompt = Query()
            result = self.prompts_db.remove(
                (Prompt.doc_id == prompt_id) & 
                (Prompt.project_id == project_id)
            )
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error deleting prompt: {str(e)}")
            return False

db = Database()
