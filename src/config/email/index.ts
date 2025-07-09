import nodemailer from "nodemailer";
// Get environment variables
const EMAIL_USER = process.env.EMAIL_USER
  ? process.env.EMAIL_USER
  : "example@example.com";
const EMAIL_PASS = process.env.EMAIL_PASS ? process.env.EMAIL_PASS : "password";

// Create Email Transporter config
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email provider
  auth: {
    user: EMAIL_USER, // Your email address
    pass: EMAIL_PASS, // Your email password key
  },
});

export default transporter;
