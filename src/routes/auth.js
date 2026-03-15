const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const { sendOtp, verifyOtp, completeSignup, login, getUserProfile,updateProfile, logout ,uploadProfilePic} = require("../controllers/authController");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/complete-signup", completeSignup);
router.post("/upload-profile-pic", uploadProfilePic);
router.post("/login", login);

router.get("/profile", authMiddleware, getUserProfile);
router.put("/update-profile", authMiddleware, updateProfile); 
router.post("/logout", logout);

module.exports = router;  