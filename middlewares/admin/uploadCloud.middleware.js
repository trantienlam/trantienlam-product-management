const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports.upload = async (req, res, next) => {
  try {
    // Ưu tiên xử lý multi-file (upload.array → req.files)
    if (req.files && req.files.length > 0) {
      const urls = [];
      for (const file of req.files) {
        const result = await streamUpload(file.buffer);
        urls.push(result.secure_url);
      }
      req.body.images = urls;
    }
    // Xử lý single-file riêng (req.file dùng cho upload.single)
    else if (req.file) {
      const result = await streamUpload(req.file.buffer);
      const field = req.file.fieldname;
      req.body[field] = result.secure_url;
    }
  } catch (err) {
    console.error("[uploadCloud] upload error:", err);
  }
  next();
};
