import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendEmailOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Smart Governance - Email Verification OTP",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`
    });

    console.log("EMAIL OTP SENT TO:", email);
    return true;

  } catch (error) {
    console.log("EMAIL SEND ERROR:", error.message);
    return false;
  }
};
