import Department from "../models/department.model.js";
import User from "../models/user.model.js";

/* ================= CREATE DEPARTMENT ================= */
export const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    const exists = await Department.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const dept = await Department.create({ name, description });

    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET DEPARTMENTS ================= */
export const getDepartments = async (req, res) => {
  const depts = await Department.find();
  res.json(depts);
};

/* ================= DELETE DEPARTMENT ================= */
export const deleteDepartment = async (req, res) => {
  const dept = await Department.findByIdAndDelete(req.params.id);

  if (!dept) {
    return res.status(404).json({ message: "Department not found" });
  }

  res.json({ message: "Department deleted" });
};

/* ================= GET ALL USERS ================= */
export const getAllUsersAdmin = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

/* ================= DELETE USER ================= */
export const deleteUserAdmin = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User deleted successfully" });
};

/* ================= ACTIVATE / DEACTIVATE USER ================= */
export const toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.is_active = !user.is_active;
  await user.save();

  res.json({
    message: `User ${user.is_active ? "Activated" : "Deactivated"}`
  });
};
