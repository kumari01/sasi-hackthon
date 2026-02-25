import express from "express";
import {
  createDepartment,
  getDepartments,
  deleteDepartment,
  getAllUsersAdmin,
  deleteUserAdmin,
  toggleUserStatus
} from "../controllers/superadmin.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// SUPERADMIN only
router.use(protect);
router.use(allowRoles("SUPERADMIN"));

/* ===== Department Management ===== */
router.post("/department", createDepartment);
router.get("/departments", getDepartments);
router.delete("/department/:id", deleteDepartment);

/* ===== User Management ===== */
router.get("/users", getAllUsersAdmin);
router.delete("/user/:id", deleteUserAdmin);
router.patch("/user/:id/toggle", toggleUserStatus);

export default router;
