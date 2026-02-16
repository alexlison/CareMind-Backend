import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, "./medicines");
  },
  filename: (req, file, cb) => {
    return cb(null, Date.now() + "-" + file.originalname);
  }
});

const uploadMedicine = multer({ storage });

export default uploadMedicine;