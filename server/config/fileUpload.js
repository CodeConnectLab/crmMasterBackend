const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads');
    try {
      await fs.access(uploadPath);
    } catch (error) {
      await fs.mkdir(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'));
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 5MB
  }
});

// Middleware for handling file upload
const handleFileUpload = async (req, res, next) => {
  try {
    upload.single('file')(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        // An unknown error occurred
        return res.status(500).json({
          success: false,
          message: 'Error uploading file',
          error: err.message
        });
      }
      
      // File upload successful
      if (req.file) {
        req.body.fileName = req.file?.filename;
        req.body.originalName = req.file.originalname;
        req.body.filePath = req.file.path;
      }
      
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleFileUpload
};