export const validateComplaint = (req, res, next) => {
  const { complaint_text, latitude, longitude } = req.body;

  // both text and at least one image are required
  const hasText = complaint_text && complaint_text.trim().length >= 10;
  const hasImage = req.files && req.files.images && req.files.images.length > 0;

  if (!hasText) {
    return res.status(400).json({
      message: "Complaint text must be at least 10 characters"
    });
  }

  if (!hasImage) {
    return res.status(400).json({
      message: "At least one image must be uploaded"
    });
  }

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "Location (latitude & longitude) required"
    });
  }

  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({ message: "Invalid latitude" });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({ message: "Invalid longitude" });
  }

  next();
};
