import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const contactsFile = path.join(__dirname, '../public/knowledge/contacts.json');
const tourFile = path.join(__dirname, '../public/data/tour.json');
const tourFileChat = path.join(__dirname, '../public/data/tour_chat.json');
const tourImagesDir = path.join(__dirname, '../public/tour_images');

// Ensure tour_images directory exists
if (!fs.existsSync(tourImagesDir)) {
    fs.mkdirSync(tourImagesDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tourImagesDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename while preserving extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

app.use(express.json());

// Serve built admin files from dist directory, fallback to admin directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
} else {
    // Fallback: serve the admin directory directly for development
    app.use(express.static(__dirname));
}

// Serve panorama images from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// Helper: ensure knowledge/contacts.json exists
function ensureContactsFile() {
    if (!fs.existsSync(contactsFile)) {
        fs.writeFileSync(contactsFile, JSON.stringify([], null, 2));
        console.log('Created new knowledge/contacts.json file.');
    }
}

// Helper: ensure /data/tour.json exists
function ensureTourFile() {
    if (!fs.existsSync(tourFile)) {
        const defaultTour = {
            scenes: []
        };
        fs.writeFileSync(tourFile, JSON.stringify(defaultTour, null, 2));
        console.log('Created new /data/tour.json file.');
    }
}

// Helper: process uploaded image - convert to WebP and create low-res version
async function processImage(inputPath, filename) {
    const nameWithoutExt = path.parse(filename).name;
    const webpPath = path.join(tourImagesDir, `${nameWithoutExt}.webp`);
    const lowResPath = path.join(tourImagesDir, `${nameWithoutExt}_lowres.webp`);

    try {
        // Get original image metadata
        const metadata = await sharp(inputPath).metadata();
        console.log(`Processing image: ${metadata.width}x${metadata.height}`);

        // Convert to WebP (high quality for main image)
        await sharp(inputPath)
            .webp({ quality: 85, effort: 4 })
            .toFile(webpPath);

        // Create low-res version (max 1024px wide, lower quality for fast loading)
        const lowResWidth = Math.min(1024, metadata.width);
        await sharp(inputPath)
            .resize(lowResWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .webp({ quality: 60, effort: 4 })
            .toFile(lowResPath);

        console.log(`Created WebP versions: ${nameWithoutExt}.webp and ${nameWithoutExt}_lowres.webp`);

        // Delete original file to save space
        fs.unlinkSync(inputPath);

        return {
            webpFilename: `${nameWithoutExt}.webp`,
            lowResFilename: `${nameWithoutExt}_lowres.webp`,
            originalWidth: metadata.width,
            originalHeight: metadata.height
        };
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

// API to get contacts
app.get('/knowledge/contacts.json', (req, res) => {
    ensureContactsFile();
    fs.readFile(contactsFile, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading contacts.');
        res.send(JSON.parse(data));
    });
});

// API to save contacts
app.post('/save-contacts', (req, res) => {
    ensureContactsFile();
    const data = req.body;
    fs.writeFile(contactsFile, JSON.stringify(data, null, 2), err => {
        if (err) return res.status(500).send('Error saving contacts.');
        res.send({ message: 'Contacts saved successfully' });
    });
});

// API to get tour data
app.get('/data/tour.json', (req, res) => {
    ensureTourFile();
    fs.readFile(tourFile, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading tour data.');
        res.send(JSON.parse(data));
    });
});

// API to save tour data
app.post('/api/save-tour', (req, res) => {
    ensureTourFile();
    const data = req.body;
    fs.writeFile(tourFile, JSON.stringify(data, null, 2), err => {
        if (err) return res.status(500).send('Error saving tour data.');
        res.send({ message: 'Tour data saved successfully' });
    });
});

// Admin API to save tour data (alternative endpoint)
app.post('/admin/api/tour', (req, res) => {
    ensureTourFile();
    const data = req.body;
    fs.writeFile(tourFile, JSON.stringify(data, null, 2), err => {
        if (err) return res.status(500).send('Error saving tour data.');
        res.send({ message: 'Tour data saved successfully' });
    });
});

// API to get available images
app.get('/admin/api/images', (req, res) => {
    try {
        const files = fs.readdirSync(tourImagesDir);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
        });
        res.json(imageFiles);
    } catch (error) {
        console.error('Error reading tour_images directory:', error);
        res.status(500).json({ error: 'Failed to read images directory' });
    }
});

// API to upload new image
app.post('/admin/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`Processing uploaded image: ${req.file.originalname}`);

        // Process the image (convert to WebP and create low-res version)
        const processed = await processImage(req.file.path, req.file.filename);

        res.json({
            message: 'Image uploaded and processed successfully',
            filename: processed.webpFilename,
            lowResFilename: processed.lowResFilename,
            originalName: req.file.originalname,
            dimensions: {
                width: processed.originalWidth,
                height: processed.originalHeight
            },
            note: 'Original file converted to WebP format with low-res preview'
        });
    } catch (error) {
        console.error('Error uploading/processing image:', error);
        res.status(500).json({ error: 'Failed to upload and process image' });
    }
});

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/knowledge/') || req.url.startsWith('/data/')) {
        return res.status(404).send('Not found');
    }

    const distPath = path.join(__dirname, 'dist');
    const indexPath = fs.existsSync(distPath)
        ? path.join(distPath, 'index.html')
        : path.join(__dirname, 'index.html');

    res.sendFile(indexPath);
});

app.listen(PORT, () => {
    ensureContactsFile();
    ensureTourFile();
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin interface available at http://localhost:${PORT}`);
});
