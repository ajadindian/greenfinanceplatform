from typing import List, Dict, Any, Optional
from .base_agent import BaseAgent
import networkx as nx
from datetime import datetime
import pandas as pd
import numpy as np
from collections import defaultdict

class DocumentRelationshipAgent(BaseAgent):
    def __init__(self):
        super().__init__('document_relationship')
        self.relationship_graph = nx.DiGraph()
        
    async def process(
        self, 
        project_id: int,
        documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze relationships between documents"""
        try:
            # Build relationship graph
            self._build_relationship_graph(documents)
            
            relationships = {
                'timestamp': datetime.utcnow().isoformat(),
                'project_id': project_id,
                'direct_relationships': await self._analyze_direct_relationships(),
                'indirect_relationships': await self._analyze_indirect_relationships(),
                'key_documents': await self._identify_key_documents(),
                'relationship_clusters': await self._identify_clusters(),
                'temporal_analysis': await self._analyze_temporal_relationships(),
                'impact_analysis': await self._analyze_document_impact()
            }
            
            return relationships
            
        except Exception as e:
            self.logger.error(f"Error analyzing document relationships: {str(e)}")
            raise
    
    def _build_relationship_graph(self, documents: List[Dict[str, Any]]) -> None:
        """Build a graph representation of document relationships"""
        try:
            self.relationship_graph.clear()
            
            # Add nodes for each document
            for doc in documents:
                self.relationship_graph.add_node(
                    doc['id'],
                    **self._extract_document_metadata(doc)
                )
            
            # Analyze and add edges for relationships
            for doc1 in documents:
                for doc2 in documents:
                    if doc1['id'] != doc2['id']:
                        relationship = self._analyze_document_pair(doc1, doc2)
                        if relationship['strength'] > 0:
                            self.relationship_graph.add_edge(
                                doc1['id'],
                                doc2['id'],
                                **relationship
                            )
                            
        except Exception as e:
            self.logger.error(f"Error building relationship graph: {str(e)}")
            raise
    
    async def _analyze_direct_relationships(self) -> List[Dict[str, Any]]:
        """Analyze direct relationships between documents"""
        try:
            direct_relationships = []
            
            for edge in self.relationship_graph.edges(data=True):
                source, target, data = edge
                relationship = {
                    'source_id': source,
                    'target_id': target,
                    'relationship_type': data.get('type'),
                    'strength': data.get('strength'),
                    'attributes': data.get('attributes', {})
                }
                direct_relationships.append(relationship)
            
            return direct_relationships
            
        except Exception as e:
            self.logger.error(f"Error analyzing direct relationships: {str(e)}")
            return []
    
    async def _analyze_indirect_relationships(self) -> List[Dict[str, Any]]:
        """Analyze indirect relationships between documents"""
        try:
            indirect_relationships = []
            
            # Find paths of length 2 or more
            for source in self.relationship_graph.nodes():
                for target in self.relationship_graph.nodes():
                    if source != target:
                        paths = list(nx.all_simple_paths(
                            self.relationship_graph,
                            source,
                            target,
                            cutoff=3
                        ))
                        
                        if len(paths) > 0:
                            relationship = {
                                'source_id': source,
                                'target_id': target,
                                'paths': self._format_paths(paths),
                                'strength': self._calculate_indirect_strength(paths)
                            }
                            indirect_relationships.append(relationship)
            
            return indirect_relationships
            
        except Exception as e:
            self.logger.error(f"Error analyzing indirect relationships: {str(e)}")
            return []
    
    async def _identify_key_documents(self) -> List[Dict[str, Any]]:
        """Identify key documents based on their relationships"""
        try:
            key_documents = []
            
            # Calculate centrality metrics
            degree_centrality = nx.degree_centrality(self.relationship_graph)
            betweenness_centrality = nx.betweenness_centrality(self.relationship_graph)
            pagerank = nx.pagerank(self.relationship_graph)
            
            for node in self.relationship_graph.nodes():
                importance_score = (
                    degree_centrality[node] +
                    betweenness_centrality[node] +
                    pagerank[node]
                ) / 3
                
                if importance_score > 0.5:  # Threshold for key documents
                    key_documents.append({
                        'document_id': node,
                        'importance_score': importance_score,
                        'metrics': {
                            'degree_centrality': degree_centrality[node],
                            'betweenness_centrality': betweenness_centrality[node],
                            'pagerank': pagerank[node]
                        }
                    })
            
            return sorted(
                key_documents,
                key=lambda x: x['importance_score'],
                reverse=True
            )
            
        except Exception as e:
            self.logger.error(f"Error identifying key documents: {str(e)}")
            return []
    
    async def _identify_clusters(self) -> List[Dict[str, Any]]:
        """Identify clusters of related documents"""
        try:
            clusters = []
            
            # Find communities using various algorithms
            communities = nx.community.greedy_modularity_communities(
                self.relationship_graph.to_undirected()
            )
            
            for idx, community in enumerate(communities):
                cluster = {
                    'id': idx,
                    'documents': list(community),
                    'size': len(community),
                    'density': nx.density(
                        self.relationship_graph.subgraph(community)
                    ),
                    'central_document': self._find_central_document(community)
                }
                clusters.append(cluster)
            
            return clusters
            
        except Exception as e:
            self.logger.error(f"Error identifying clusters: {str(e)}")
            return [] 