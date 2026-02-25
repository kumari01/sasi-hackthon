export const validateDepartment = (req, res, next) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({
      message: "Department name and description required"
    });
  }

  if (name.length < 3) {
    return res.status(400).json({
      message: "Department name too short"
    });
  }

  next();
};
