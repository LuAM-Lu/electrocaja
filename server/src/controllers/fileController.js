const fs = require('fs');
const path = require('path');

// Helper to sanitize and resolve paths
// Helper to sanitize and resolve paths
const resolvePath = (rootName, relativePath) => {
    let rootDir;
    if (rootName === 'uploads') {
        rootDir = path.join(__dirname, '../../uploads');
    } else if (rootName === 'public') {
        rootDir = path.join(__dirname, '../../../client/public');
    } else {
        throw new Error('Invalid root directory');
    }

    const resolvedPath = path.resolve(rootDir, relativePath || '');

    // Security check: ensure resolved path is within rootDir
    if (!resolvedPath.startsWith(rootDir)) {
        throw new Error('Access denied');
    }

    return { resolvedPath, rootDir };
};

const getFileTree = (req, res) => {
    try {
        const { root, path: relativePath } = req.query;

        if (!['uploads', 'public'].includes(root)) {
            return res.status(400).json({ error: 'Invalid root directory. Must be uploads or public' });
        }

        const { resolvedPath } = resolvePath(root, relativePath || '');

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        const files = fs.readdirSync(resolvedPath).map(file => {
            const filePath = path.join(resolvedPath, file);
            const fileStats = fs.statSync(filePath);
            return {
                id: path.join(relativePath || '', file),
                name: file,
                isDir: fileStats.isDirectory(),
                size: fileStats.size,
                modified: fileStats.mtime
            };
        });

        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const uploadFile = (req, res) => {
    // Requires multer middleware in the route
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', file: req.file });
};

const deleteItem = (req, res) => {
    try {
        const { root, path: relativePath } = req.query;
        const { resolvedPath } = resolvePath(root, relativePath);

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const stats = fs.statSync(resolvedPath);
        if (stats.isDirectory()) {
            fs.rmdirSync(resolvedPath, { recursive: true });
        } else {
            fs.unlinkSync(resolvedPath);
        }

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createFolder = (req, res) => {
    try {
        const { root, path: relativePath, name } = req.body;
        const { resolvedPath } = resolvePath(root, relativePath || '');
        const newFolderPath = path.join(resolvedPath, name);

        if (fs.existsSync(newFolderPath)) {
            return res.status(400).json({ error: 'Folder already exists' });
        }

        fs.mkdirSync(newFolderPath);
        res.json({ message: 'Folder created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const downloadFile = (req, res) => {
    try {
        const { root, path: relativePath } = req.query;
        const { resolvedPath } = resolvePath(root, relativePath);

        if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(resolvedPath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getFileTree,
    uploadFile,
    deleteItem,
    createFolder,
    downloadFile
};
