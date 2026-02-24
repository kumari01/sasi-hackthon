// Validate Register Middleware
import User from "../models/user.model.js";

export const validateRegister = (req, res, next) => {
  console.log("VALIDATE REGISTER HIT");
  console.log("REQUEST BODY:", req.body);

  const { name, email, phone, aadhaar_number, password } = req.body;

  // ---------- Required fields ----------
  if (!name || !email || !phone || !aadhaar_number || !password) {
    console.log("VALIDATION ERROR: Missing required fields");
    return res.status(400).json({ message: "All fields are required" });
  }

  // ---------- Name validation ----------
  if (name.trim().length < 3 || name.length > 50) {
    console.log("VALIDATION ERROR: Invalid name length");
    return res.status(400).json({
      message: "Name must be between 3 and 50 characters"
    });
  }

  // ---------- Email validation ----------
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("VALIDATION ERROR: Invalid email format");
    return res.status(400).json({ message: "Invalid email format" });
  }

  // ---------- Indian Phone validation ----------
  if (!/^[6-9]\d{9}$/.test(phone)) {
    console.log("VALIDATION ERROR: Invalid phone number");
    return res.status(400).json({
      message: "Phone number must be a valid 10-digit Indian number"
    });
  }

  // ---------- Aadhaar validation ----------
  if (!/^\d{12}$/.test(aadhaar_number) || !validateAadhaar(aadhaar_number)) {
    console.log("VALIDATION ERROR: Invalid Aadhaar (checksum failed)");
    return res.status(400).json({
      message: "Invalid Aadhaar number"
    });
  }

  // ---------- Password validation ----------
  if (password.length < 8) {
    console.log("VALIDATION ERROR: Password too short");
    return res.status(400).json({
      message: "Password must be at least 8 characters"
    });
  }

  // Optional strong password rule (uncomment if needed)
  
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
  if (!strongPassword.test(password)) {
    console.log("VALIDATION ERROR: Weak password");
    return res.status(400).json({
      message: "Password must contain uppercase, lowercase, number and symbol"
    });
  }
  

  console.log("VALIDATION PASSED");
  next();
};



// ================= Aadhaar Verhoeff Checksum =================

const d = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0]
];

const p = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8]
];

function validateAadhaar(num) {
  let c = 0;
  const reversed = num.split("").reverse().map(Number);

  for (let i = 0; i < reversed.length; i++) {
    c = d[c][p[i % 8][reversed[i]]];
  }

  return c === 0;
}


export const checkDuplicateUser = async (req, res, next) => {
  try {
    const { email, phone, aadhaar_number } = req.body;

    console.log("CHECK DUPLICATE USER");

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone },
        { aadhaar_number }
      ]
    });

    if (!existingUser) {
      console.log("No duplicate user found");
      return next();
    }

    if (existingUser.email === email.toLowerCase()) {
      console.log("DUPLICATE ERROR: Email already registered");
      return res.status(400).json({ message: "Email already registered" });
    }

    if (existingUser.phone === phone) {
      console.log("DUPLICATE ERROR: Phone already registered");
      return res.status(400).json({ message: "Phone number already registered" });
    }

    if (existingUser.aadhaar_number === aadhaar_number) {
      console.log("DUPLICATE ERROR: Aadhaar already registered");
      return res.status(400).json({ message: "Aadhaar number already registered" });
    }

    next();

  } catch (error) {
    console.log("DUPLICATE CHECK ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
