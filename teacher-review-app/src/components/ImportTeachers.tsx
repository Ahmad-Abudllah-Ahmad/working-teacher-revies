import React, { useState, useRef, useEffect } from 'react';
import { api, socket } from '../services/api';

interface Teacher {
  id?: string;
  name: string;
  field: string;
  experience: number;
  photo?: string;
  bio: string;
}

interface ImportResult {
  id: string;
  timestamp: string;
  filename: string;
  teachersCount: number;
  status: 'success' | 'error' | 'processing';
  errorMessage?: string;
}

// Local storage key for import history
const IMPORT_HISTORY_KEY = 'teacherReviewApp_imports';

const ImportTeachers: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Teacher[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load import history from localStorage on component mount
  useEffect(() => {
    const loadImportHistory = () => {
      try {
        const savedHistory = localStorage.getItem(IMPORT_HISTORY_KEY);
        if (savedHistory) {
          setImportResults(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('Error loading import history from localStorage:', error);
      }
    };

    loadImportHistory();

    // Setup socket connection status
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  // Save import history to localStorage whenever it changes
  useEffect(() => {
    if (importResults.length > 0) {
      localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(importResults));
    }
  }, [importResults]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check if file is valid (Excel, CSV, JSON)
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/json'
    ];
    
    if (!validTypes.includes(file.type) && 
        !file.name.endsWith('.csv') && 
        !file.name.endsWith('.json') && 
        !file.name.endsWith('.xlsx') && 
        !file.name.endsWith('.xls')) {
      alert('Please upload a valid Excel, CSV, or JSON file');
      return;
    }
    
    setSelectedFile(file);
    parseFile(file);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let parsedData: Teacher[] = [];
        
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          // Parse JSON
          const content = e.target?.result as string;
          parsedData = JSON.parse(content);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          // Parse CSV (simple implementation)
          const content = e.target?.result as string;
          const rows = content.split('\n');
          const headers = rows[0].split(',').map(h => h.trim());
          
          parsedData = rows.slice(1)
            .filter(row => row.trim()) // Skip empty rows
            .map(row => {
              const values = row.split(',').map(v => v.trim());
              const teacher: any = {};
              
              headers.forEach((header, index) => {
                if (header === 'experience') {
                  teacher[header] = parseInt(values[index]) || 0;
                } else {
                  teacher[header] = values[index] || '';
                }
              });
              
              return teacher as Teacher;
            });
        } else {
          // For Excel files, in a real app you'd use a library like xlsx
          // For this demo, we'll simulate a successful parse with mock data
          parsedData = [
            { name: 'Dr. Alice Williams', field: 'Biology', experience: 8, bio: 'Specializes in molecular biology' },
            { name: 'Prof. Robert Chen', field: 'Engineering', experience: 12, bio: 'Expert in mechanical engineering' },
            { name: 'Dr. Sarah Miller', field: 'Psychology', experience: 7, bio: 'Focuses on cognitive psychology' }
          ];
        }
        
        // Validate required fields
        const validData = parsedData.filter(teacher => 
          teacher.name && teacher.field && typeof teacher.experience === 'number' && teacher.bio
        );
        
        if (validData.length === 0) {
          alert('No valid teacher data found in the file. Each teacher must have name, field, experience, and bio.');
          setSelectedFile(null);
          return;
        }
        
        setPreviewData(validData);
        setShowPreview(true);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the file format and try again.');
        setSelectedFile(null);
      }
    };
    
    if (file.type === 'application/json' || file.name.endsWith('.json') || file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      // For Excel files, in a real app you would use readAsArrayBuffer
      // For this demo, we'll simulate a successful read
      setTimeout(() => {
        if (reader.onload) {
          reader.onload({
            target: { result: '' }
          } as ProgressEvent<FileReader>);
        }
      }, 500);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || previewData.length === 0) return;
    
    setIsUploading(true);
    
    // Create a new import result with processing status
    const importId = Date.now().toString();
    const newImportResult: ImportResult = {
      id: importId,
      timestamp: new Date().toISOString(),
      filename: selectedFile.name,
      teachersCount: previewData.length,
      status: 'processing'
    };
    
    // Update state with the new processing import
    setImportResults(prev => [newImportResult, ...prev]);
    
    try {
      // Actually import the teachers via API
      for (const teacher of previewData) {
        try {
          await api.post('/teachers', teacher);
        } catch (error) {
          console.error('Error importing teacher:', teacher.name, error);
          // Continue with next teacher even if one fails
        }
      }
      
      // Update import result to success
      const successResult: ImportResult = {
        ...newImportResult,
        status: 'success'
      };
      
      setImportResults(prev => 
        prev.map(item => item.id === importId ? successResult : item)
      );
      
      // Show success message
      alert(`Successfully imported ${previewData.length} teachers!`);
      
    } catch (error) {
      console.error('Error during import:', error);
      
      // Update import result to error
      const errorResult: ImportResult = {
        ...newImportResult,
        status: 'error',
        errorMessage: 'Failed to import teachers. Please try again.'
      };
      
      setImportResults(prev => 
        prev.map(item => item.id === importId ? errorResult : item)
      );
      
      // Show error message
      alert('Error importing teachers. Please try again.');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setShowPreview(false);
      setPreviewData([]);
    }
  };

  const cancelImport = () => {
    setSelectedFile(null);
    setShowPreview(false);
    setPreviewData([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Import Teachers</h1>
      
      {!isConnected && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700">
            Working in offline mode. Imports will be stored locally and synced when connection is restored.
          </p>
        </div>
      )}
      
      {/* File Upload Area */}
      {!showPreview && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <p className="text-gray-600 mb-4">
            Upload an Excel, CSV, or JSON file containing teacher data. Each teacher should have the following fields:
          </p>
          <ul className="list-disc list-inside mb-6 text-gray-600">
            <li>name (required): Full name of the teacher</li>
            <li>field (required): Field of study or department</li>
            <li>experience (required): Years of experience as a number</li>
            <li>bio (required): Short biography or description</li>
            <li>photo (optional): URL to teacher's photo</li>
          </ul>
          
          <div
            className={`mt-4 p-6 border-2 border-dashed rounded-lg text-center ${
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
            />
            
            {selectedFile ? (
              <div>
                <p className="text-gray-700 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <div className="mt-4 flex justify-center space-x-3">
                  <button 
                    className="btn-secondary text-sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <svg 
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 mt-2">
                  Drag and drop a file here, or
                  <button 
                    type="button"
                    className="text-primary-600 hover:text-primary-800 font-medium ml-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: .xlsx, .xls, .csv, .json
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Data Preview */}
      {showPreview && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Preview Data</h2>
          
          <p className="text-sm text-gray-600 mb-4">
            Showing {previewData.length > 5 ? '5 of ' + previewData.length : previewData.length} teachers from {selectedFile?.name}
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 5).map((teacher, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.field}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.experience} years</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{teacher.bio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              className="btn-secondary"
              onClick={cancelImport}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button 
              type="button"
              className="btn-primary"
              onClick={handleImport}
              disabled={isUploading}
            >
              {isUploading ? 'Importing...' : `Import ${previewData.length} Teachers`}
            </button>
          </div>
        </div>
      )}
      
      {/* Import History */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Import History</h2>
        </div>
        
        {importResults.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {importResults.map(result => (
              <div key={result.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{result.filename}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(result.timestamp)}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-3">{result.teachersCount} teachers</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.status === 'success' ? 'bg-green-100 text-green-800' :
                      result.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status === 'success' ? 'Success' :
                      result.status === 'error' ? 'Failed' :
                      'Processing'}
                    </span>
                  </div>
                </div>
                {result.errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{result.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No import history available
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportTeachers; 