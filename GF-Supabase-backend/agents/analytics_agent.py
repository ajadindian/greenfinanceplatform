from typing import List, Dict, Any, Optional
from .base_agent import BaseAgent
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import json
from error_handler import AppError

class AnalyticsAgent(BaseAgent):
    def __init__(self):
        super().__init__('analytics')
        self.update_frequency = self.config.get('update_frequency', '1h')
        self.alert_threshold = self.config.get('alert_threshold', 0.15)
        self.forecast_window = self.config.get('forecast_window', '30d')
        self.confidence_threshold = self.config.get('confidence_threshold', 0.8)
        
    async def process(
        self, 
        project_id: int, 
        data: Dict[str, Any], 
        analysis_type: str = 'all'
    ) -> Dict[str, Any]:
        """Process project data and generate insights"""
        try:
            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'project_id': project_id,
                'insights': [],
                'forecasts': {},
                'alerts': [],
                'recommendations': []
            }
            
            # Convert data to DataFrame for analysis
            df = self._prepare_data(data)
            
            if analysis_type in ['all', 'trends']:
                results['insights'].extend(await self._analyze_trends(df))
            
            if analysis_type in ['all', 'forecast']:
                results['forecasts'] = await self._generate_forecasts(df)
            
            if analysis_type in ['all', 'alerts']:
                results['alerts'] = await self._check_alerts(df)
            
            if analysis_type in ['all', 'recommendations']:
                results['recommendations'] = await self._generate_recommendations(df)
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error in analytics processing: {str(e)}")
            raise AppError(f"Analytics processing failed: {str(e)}")
    
    def _prepare_data(self, data: Dict[str, Any]) -> pd.DataFrame:
        """Prepare data for analysis"""
        try:
            # Convert dictionary data to DataFrame
            if isinstance(data.get('data'), pd.DataFrame):
                df = data['data']
            else:
                df = pd.DataFrame(data.get('data', []))
            
            # Convert date columns to datetime
            date_columns = df.select_dtypes(include=['object']).columns
            for col in date_columns:
                try:
                    df[col] = pd.to_datetime(df[col])
                except:
                    continue
            
            return df
            
        except Exception as e:
            self.logger.error(f"Error preparing data: {str(e)}")
            raise
    
    async def _analyze_trends(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze trends in the data"""
        insights = []
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                # Calculate basic statistics
                stats = df[col].describe()
                
                # Detect trends
                if len(df) > 1:
                    trend = np.polyfit(range(len(df)), df[col].fillna(method='ffill'), 1)[0]
                    trend_direction = "increasing" if trend > 0 else "decreasing"
                    
                    insights.append({
                        'type': 'trend',
                        'metric': col,
                        'direction': trend_direction,
                        'magnitude': abs(trend),
                        'confidence': self._calculate_confidence(df[col])
                    })
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error analyzing trends: {str(e)}")
            return []
    
    async def _generate_forecasts(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate forecasts for numeric columns"""
        forecasts = {}
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            date_cols = df.select_dtypes(include=['datetime64']).columns
            
            if len(date_cols) > 0 and len(df) > 10:  # Minimum data points for forecasting
                date_col = date_cols[0]
                
                for target_col in numeric_cols:
                    if target_col == date_col:
                        continue
                        
                    forecast = self._forecast_metric(
                        df,
                        date_col,
                        target_col
                    )
                    
                    if forecast:
                        forecasts[target_col] = forecast
            
            return forecasts
            
        except Exception as e:
            self.logger.error(f"Error generating forecasts: {str(e)}")
            return {}
    
    def _forecast_metric(
        self, 
        df: pd.DataFrame, 
        date_col: str, 
        target_col: str
    ) -> Optional[Dict[str, Any]]:
        """Generate forecast for a specific metric"""
        try:
            # Prepare data for forecasting
            X = (df[date_col] - df[date_col].min()).dt.days.values.reshape(-1, 1)
            y = df[target_col].values
            
            # Split data for validation
            train_size = int(len(df) * 0.8)
            X_train, X_test = X[:train_size], X[train_size:]
            y_train, y_test = y[:train_size], y[train_size:]
            
            # Train model
            model = LinearRegression()
            model.fit(X_train, y_train)
            
            # Calculate confidence
            confidence = model.score(X_test, y_test)
            
            if confidence < self.confidence_threshold:
                return None
            
            # Generate forecast
            last_date = df[date_col].max()
            forecast_days = pd.Timedelta(self.forecast_window).days
            future_dates = [last_date + timedelta(days=i) for i in range(1, forecast_days + 1)]
            
            X_future = np.array([(d - df[date_col].min()).days 
                               for d in future_dates]).reshape(-1, 1)
            y_future = model.predict(X_future)
            
            return {
                'dates': [d.isoformat() for d in future_dates],
                'values': y_future.tolist(),
                'confidence': confidence,
                'method': 'linear_regression'
            }
            
        except Exception as e:
            self.logger.error(f"Error forecasting {target_col}: {str(e)}")
            return None
    
    async def _check_alerts(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Check for anomalies and generate alerts"""
        alerts = []
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                # Calculate statistics
                mean = df[col].mean()
                std = df[col].std()
                
                # Check recent values
                recent_values = df[col].tail(5)
                for idx, value in enumerate(recent_values):
                    z_score = (value - mean) / std if std > 0 else 0
                    
                    if abs(z_score) > 2:  # More than 2 standard deviations
                        alerts.append({
                            'type': 'anomaly',
                            'metric': col,
                            'value': value,
                            'expected_range': [mean - 2*std, mean + 2*std],
                            'severity': 'high' if abs(z_score) > 3 else 'medium',
                            'timestamp': datetime.utcnow().isoformat()
                        })
            
            return alerts
            
        except Exception as e:
            self.logger.error(f"Error checking alerts: {str(e)}")
            return []
    
    async def _generate_recommendations(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate recommendations based on data analysis"""
        recommendations = []
        
        try:
            # Analyze data patterns
            patterns = self._analyze_patterns(df)
            
            # Generate recommendations based on patterns
            for pattern in patterns:
                if pattern['significance'] > self.alert_threshold:
                    recommendations.append({
                        'type': 'optimization',
                        'metric': pattern['metric'],
                        'suggestion': pattern['suggestion'],
                        'potential_impact': pattern['impact'],
                        'confidence': pattern['confidence']
                    })
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Error generating recommendations: {str(e)}")
            return []
    
    def _analyze_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze patterns in the data"""
        patterns = []
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                # Calculate basic statistics
                stats = df[col].describe()
                
                # Check for patterns
                if stats['std'] > 0:
                    patterns.append({
                        'metric': col,
                        'significance': stats['std'] / stats['mean'],
                        'suggestion': f"Monitor variations in {col}",
                        'impact': 'medium',
                        'confidence': self._calculate_confidence(df[col])
                    })
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Error analyzing patterns: {str(e)}")
            return []
    
    def _calculate_confidence(self, series: pd.Series) -> float:
        """Calculate confidence score for a series"""
        try:
            # Calculate based on data quality
            missing_ratio = series.isna().mean()
            variance_ratio = series.std() / (series.mean() if series.mean() != 0 else 1)
            
            confidence = (1 - missing_ratio) * (1 / (1 + variance_ratio))
            return round(max(min(confidence, 1.0), 0.0), 2)
            
        except Exception as e:
            self.logger.error(f"Error calculating confidence: {str(e)}")
            return 0.0 