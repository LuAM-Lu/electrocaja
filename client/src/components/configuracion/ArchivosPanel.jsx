import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Folder, File, Download, Trash2, Upload, Plus, ChevronRight,
    ArrowUp, Search, RefreshCw, Image as ImageIcon, FileText, AlertCircle,
    HardDrive, List, Grid, LayoutGrid, ArrowUpDown
} from 'lucide-react';
import { api } from '../../config/api';
import toast from '../../utils/toast';

const ArchivosPanel = () => {
    const [root, setRoot] = useState('uploads'); // 'uploads' | 'public'
    const [currentPath, setCurrentPath] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'type', 'date'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const fileInputRef = useRef(null);

    // Cargar archivos
    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/files/list`, {
                params: { root, path: currentPath }
            });
            setFiles(response.data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar archivos');
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [root, currentPath]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Navegación
    const handleNavigate = (folderName) => {
        setCurrentPath(prev => prev ? `${prev}/${folderName}` : folderName);
    };

    const handleGoUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const navigateToBreadcrumb = (index) => {
        const parts = currentPath.split('/');
        const newPath = parts.slice(0, index + 1).join('/');
        setCurrentPath(newPath);
    };

    // Acciones
    const handleDownload = async (file) => {
        try {
            const filePath = file.id; // relative path
            const url = `${api.defaults.baseURL}/files/download?root=${root}&path=${encodeURIComponent(filePath)}`;
            window.open(url, '_blank');
        } catch (err) {
            toast.error('Error al descargar archivo');
        }
    };

    const handleDelete = async (file) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${file.name}"?`)) return;

        try {
            await api.delete('/files', {
                params: { root, path: file.id }
            });
            toast.success('Elemento eliminado');
            fetchFiles();
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('root', root);
        formData.append('path', currentPath);

        try {
            setUploading(true);
            await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Archivo subido');
            fetchFiles();
        } catch (err) {
            toast.error('Error al subir archivo');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt('Nombre de la nueva carpeta:');
        if (!name) return;

        try {
            await api.post('/files/folder', {
                root,
                path: currentPath,
                name
            });
            toast.success('Carpeta creada');
            fetchFiles();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al crear carpeta');
        }
    };

    // Render Helpers
    const getFileIcon = (file) => {
        if (file.isDir) return <Folder className="h-5 w-5 text-blue-500 fill-blue-50" />;
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return <ImageIcon className="h-5 w-5 text-purple-500" />;
        }
        return <FileText className="h-5 w-5 text-gray-500" />;
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filteredAndSortedFiles = files
        .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            // Siempre carpetas primero
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date':
                    comparison = new Date(a.modified || 0) - new Date(b.modified || 0);
                    break;
                case 'type':
                    const extA = a.name.split('.').pop().toLowerCase();
                    const extB = b.name.split('.').pop().toLowerCase();
                    comparison = extA.localeCompare(extB);
                    break;
                default:
                    comparison = 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const toggleViewMode = () => {
        setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header de Control */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => { setRoot('uploads'); setCurrentPath(''); }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${root === 'uploads' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            Uploads
                        </button>
                        <button
                            onClick={() => { setRoot('public'); setCurrentPath(''); }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${root === 'public' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            Public
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Selector de Ordenamiento */}
                        <div className="flex items-center bg-white rounded-lg border border-gray-300 overflow-hidden h-9">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="pl-3 pr-8 py-1.5 text-sm text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer h-full"
                            >
                                <option value="name">Nombre</option>
                                <option value="size">Tamaño</option>
                                <option value="type">Tipo</option>
                                <option value="date">Fecha</option>
                            </select>
                        </div>
                        <button
                            onClick={toggleSortOrder}
                            className="p-2 text-gray-500 hover:bg-white hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 h-9 w-9 flex items-center justify-center"
                            title={`Orden: ${sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}`}
                        >
                            <ArrowUpDown className={`h-4 w-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1"></div>

                        <button
                            onClick={toggleViewMode}
                            className="p-2 text-gray-500 hover:bg-white hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 h-9 w-9 flex items-center justify-center"
                            title={viewMode === 'grid' ? "Vista de lista" : "Vista de cuadrícula"}
                        >
                            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                        </button>

                        <button
                            onClick={fetchFiles}
                            className="p-2 text-gray-500 hover:bg-white hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 h-9 w-9 flex items-center justify-center"
                            title="Recargar"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1"></div>

                        <button
                            onClick={handleCreateFolder}
                            className="flex items-center px-3 h-9 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span className="hidden sm:inline">Carpeta</span>
                        </button>
                        <label className="flex items-center px-3 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm">
                            {uploading ? (
                                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-1.5" />
                            )}
                            <span className="hidden sm:inline">Subir</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                {/* Barra de Navegación y Búsqueda */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleGoUp}
                        disabled={!currentPath}
                        className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 rounded-md transition-colors"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </button>

                    <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-600 overflow-x-auto">
                        <HardDrive className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span
                            className={`cursor-pointer hover:text-blue-600 hover:underline ${!currentPath ? 'font-semibold text-gray-900' : ''}`}
                            onClick={() => setCurrentPath('')}
                        >
                            {root === 'uploads' ? 'Uploads' : 'Public'}
                        </span>
                        {currentPath && currentPath.split('/').map((part, index) => (
                            <div key={index} className="flex items-center whitespace-nowrap">
                                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                                <span
                                    className="cursor-pointer hover:text-blue-600 hover:underline"
                                    onClick={() => navigateToBreadcrumb(index)}
                                >
                                    {part}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="relative hidden sm:block">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-48 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Lista de Archivos */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-red-500">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>{error}</p>
                    </div>
                ) : filteredAndSortedFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Folder className="h-12 w-12 mb-2 text-gray-200" />
                        <p>Carpeta vacía</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredAndSortedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="group relative flex flex-col p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
                                        onDoubleClick={() => file.isDir && handleNavigate(file.name)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors shadow-sm">
                                                {getFileIcon(file)}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                                {!file.isDir && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-md"
                                                        title="Descargar"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-auto">
                                            <h4 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                                {file.name}
                                            </h4>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {file.isDir ? 'Carpeta' : formatSize(file.size)}
                                                </span>
                                                {file.modified && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(file.modified).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modificado</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAndSortedFiles.map((file) => (
                                            <tr
                                                key={file.id}
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onDoubleClick={() => file.isDir && handleNavigate(file.name)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-lg">
                                                            {getFileIcon(file)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{file.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {file.isDir ? '-' : formatSize(file.size)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {file.modified ? new Date(file.modified).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        {!file.isDir && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                                                className="text-blue-600 hover:text-blue-900 p-1"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                                                            className="text-red-600 hover:text-red-900 p-1"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ArchivosPanel;
