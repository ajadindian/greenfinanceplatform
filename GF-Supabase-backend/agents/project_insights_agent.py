from typing import List, Dict, Any, Optional
from .base_agent import BaseAgent
from .analytics_agent import AnalyticsAgent
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from collections import defaultdict

class ProjectInsightsAgent(BaseAgent):
    def __init__(self):
        super().__init__('project_insights')
        self.analytics_agent = AnalyticsAgent()
        
    async def process(
        self, 
        project_id: int,
        project_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive project insights"""
        try:
            insights = {
                'timestamp': datetime.utcnow().isoformat(),
                'project_id': project_id,
                'summary': await self._generate_project_summary(project_data),
                'risk_analysis': await self._analyze_risks(project_data),
                'progress_tracking': await self._track_progress(project_data),
                'resource_optimization': await self._analyze_resources(project_data),
                'cost_analysis': await self._analyze_costs(project_data),
                'schedule_analysis': await self._analyze_schedule(project_data)
            }
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error generating project insights: {str(e)}")
            raise
    
    async def _generate_project_summary(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate high-level project summary"""
        try:
            summary = {
                'overall_status': self._calculate_overall_status(project_data),
                'key_metrics': await self._extract_key_metrics(project_data),
                'recent_changes': await self._identify_recent_changes(project_data),
                'upcoming_milestones': await self._get_upcoming_milestones(project_data)
            }
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Error generating project summary: {str(e)}")
            return {}
    
    async def _analyze_risks(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze project risks"""
        try:
            risks = {
                'high_priority': [],
                'medium_priority': [],
                'low_priority': [],
                'risk_trends': [],
                'mitigation_suggestions': []
            }
            
            # Analyze different risk categories
            schedule_risks = await self._analyze_schedule_risks(project_data)
            cost_risks = await self._analyze_cost_risks(project_data)
            resource_risks = await self._analyze_resource_risks(project_data)
            
            # Categorize risks by priority
            for risk in schedule_risks + cost_risks + resource_risks:
                if risk['priority'] == 'high':
                    risks['high_priority'].append(risk)
                elif risk['priority'] == 'medium':
                    risks['medium_priority'].append(risk)
                else:
                    risks['low_priority'].append(risk)
            
            # Generate risk trends
            risks['risk_trends'] = await self._analyze_risk_trends(project_data)
            
            # Generate mitigation suggestions
            risks['mitigation_suggestions'] = self._generate_mitigation_suggestions(risks)
            
            return risks
            
        except Exception as e:
            self.logger.error(f"Error analyzing risks: {str(e)}")
            return {}
    
    async def _track_progress(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Track project progress"""
        try:
            progress = {
                'overall_progress': self._calculate_progress(project_data),
                'milestone_tracking': await self._track_milestones(project_data),
                'task_completion': await self._analyze_task_completion(project_data),
                'timeline_analysis': await self._analyze_timeline(project_data),
                'bottlenecks': await self._identify_bottlenecks(project_data)
            }
            
            return progress
            
        except Exception as e:
            self.logger.error(f"Error tracking progress: {str(e)}")
            return {}
    
    async def _analyze_resources(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze resource utilization and optimization"""
        try:
            resources = {
                'utilization': await self._analyze_resource_utilization(project_data),
                'allocation': await self._analyze_resource_allocation(project_data),
                'constraints': await self._identify_resource_constraints(project_data),
                'optimization_suggestions': await self._generate_resource_suggestions(project_data)
            }
            
            return resources
            
        except Exception as e:
            self.logger.error(f"Error analyzing resources: {str(e)}")
            return {}
    
    async def _analyze_costs(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze project costs"""
        try:
            costs = {
                'budget_tracking': await self._track_budget(project_data),
                'cost_variance': await self._analyze_cost_variance(project_data),
                'forecasted_costs': await self._forecast_costs(project_data),
                'cost_optimization': await self._generate_cost_optimization(project_data)
            }
            
            return costs
            
        except Exception as e:
            self.logger.error(f"Error analyzing costs: {str(e)}")
            return {}
    
    async def _analyze_schedule(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze project schedule"""
        try:
            schedule = {
                'timeline_status': await self._analyze_timeline_status(project_data),
                'delay_analysis': await self._analyze_delays(project_data),
                'critical_path': await self._identify_critical_path(project_data),
                'schedule_optimization': await self._generate_schedule_optimization(project_data)
            }
            
            return schedule
            
        except Exception as e:
            self.logger.error(f"Error analyzing schedule: {str(e)}")
            return {}
    
    # Helper methods for detailed analysis
    def _calculate_overall_status(self, project_data: Dict[str, Any]) -> str:
        """Calculate overall project status"""
        try:
            # Implement status calculation logic
            progress = self._calculate_progress(project_data)
            schedule_status = self._calculate_schedule_status(project_data)
            cost_status = self._calculate_cost_status(project_data)
            
            # Determine overall status based on multiple factors
            if progress['on_track'] and schedule_status['on_time'] and cost_status['within_budget']:
                return 'healthy'
            elif progress['critical_issues'] or schedule_status['severe_delays'] or cost_status['severe_overrun']:
                return 'critical'
            else:
                return 'at_risk'
                
        except Exception as e:
            self.logger.error(f"Error calculating overall status: {str(e)}")
            return 'unknown' 