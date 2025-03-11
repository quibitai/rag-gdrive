"use client";

import { useState, useEffect } from 'react';
import { generateEmbeddings } from '@/actions/knowledgebase-embeddings';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  lastModified: string;
  sourceLocation: 'google-drive' | 'manual-upload';
  processingStatus: 'pending' | 'success' | 'error';
  errorMessage?: string;
  processedAt?: string;
  chunkCount: number;
}

interface FileCatalog {
  lastUpdated: string;
  files: Record<string, FileMetadata>;
}

export function FileStatus() {
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<FileCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch the file catalog
  const fetchCatalog = async () => {
    try {
      const response = await fetch('/api/file-catalog');
      if (!response.ok) {
        throw new Error('Failed to fetch file catalog');
      }
      const data = await response.json();
      setCatalog(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching file catalog:', err);
    }
  };
  
  // Fetch catalog on component mount
  useEffect(() => {
    fetchCatalog();
  }, []);
  
  // Function to trigger update
  const handleUpdate = async () => {
    setLoading(true);
    try {
      await generateEmbeddings();
      await fetchCatalog(); // Refresh catalog after update
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating embeddings:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };
  
  // Get status badge
  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Knowledge Base Files</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCatalog} 
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          {catalog ? (
            <>Last updated: {formatDate(catalog.lastUpdated)}</>
          ) : (
            <>Loading file information...</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {!catalog ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : Object.keys(catalog.files).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No files in knowledge base yet. Add files to your Google Drive folder or manually to the knowledgebase directory.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm font-medium">Total Files: {Object.keys(catalog.files).length}</div>
              <div className="text-sm font-medium text-right">
                Success: {Object.values(catalog.files).filter(f => f.processingStatus === 'success').length} | 
                Error: {Object.values(catalog.files).filter(f => f.processingStatus === 'error').length} | 
                Pending: {Object.values(catalog.files).filter(f => f.processingStatus === 'pending').length}
              </div>
            </div>
            
            <div className="border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(catalog.files).map((file) => (
                    <tr key={file.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {file.name}
                        <div className="text-xs text-gray-500">{file.sourceLocation}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.chunkCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusBadge(file.processingStatus)}
                        {file.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">{file.errorMessage}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Files are automatically checked for changes during updates
        </div>
        <Button 
          onClick={handleUpdate} 
          disabled={loading}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update Knowledge Base
        </Button>
      </CardFooter>
    </Card>
  );
} 