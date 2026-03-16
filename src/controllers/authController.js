// const Otp = require("../models/Otp");
// const User = require("../models/User");
// const validateEmail = require("../utils/emailValidator");
// const generateOTP = require("../utils/otpGenerator");
// const sendEmail = require("../utils/sendEmail");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const cloudinary = require("../config/cloudinary");

// exports.uploadProfilePic = async (req, res) => {
//   try {
//     const { image } = req.body; 

//     if (!image) {
//       return res.status(400).json({ message: "No image provided" });
//     }

//     const result = await cloudinary.uploader.upload(image, {
//       folder: "uniTalk/profiles",
//       transformation: [
//         { width: 300, height: 300, crop: "fill", gravity: "face" },
//         { quality: "auto", fetch_format: "auto" },
//       ],
//     });

//     res.status(200).json({
//       message: "Image uploaded successfully",
//       url: result.secure_url,
//     });
//   } catch (error) {
//     console.log("UPLOAD PROFILE PIC ERROR:", error);
//     res.status(500).json({ message: "Image upload failed" });
//   }
// };

// exports.sendOtp = async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log("Email received:", email);

//     if (!validateEmail(email)) {
//       return res.status(400).json({ message: "Invalid college email" });
//     }

//     const existingUser = await User.findOne({ email, isProfileComplete: true });
//     if (existingUser) {
//       return res.status(400).json({
//         message: "User already registered. Please login instead.",
//       });
//     }

//     const otp = generateOTP();

//     await Otp.deleteMany({ email });
//     await Otp.create({ email, otp });

//     await sendEmail(email, otp);

//     res.json({ message: "OTP sent to email" });
//   } catch (error) {
//     console.log("SEND OTP ERROR:", error);
//     res.status(500).json({ message: "OTP send failed" });
//   }
// };

// exports.verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const record = await Otp.findOne({ email, otp });

//     if (!record) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     await Otp.deleteMany({ email });

//     let user = await User.findOne({ email });

//     if (!user) {
//       user = await User.create({
//         email,
//         isEmailVerified: true,
//         isProfileComplete: false,
//       });
//     } else {
//       user.isEmailVerified = true;
//       await user.save();
//     }

//     res.json({
//       message: "Email verified successfully",
//       email: user.email,
//     });
//   } catch (error) {
//     console.log("VERIFY OTP ERROR:", error);
//     res.status(500).json({ message: "Verification failed" });
//   }
// };

// exports.completeSignup = async (req, res) => {
//   try {
//     const { email, name, gender, password, profilePic } = req.body;

//     const user = await User.findOne({ email, isEmailVerified: true });

//     if (!user) {
//       return res.status(400).json({ message: "Email not verified" });
//     }

//     if (user.isProfileComplete) {
//       return res.status(400).json({ message: "Profile already completed" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     user.name = name;
//     user.gender = gender;
//     user.password = hashedPassword;
//     user.profilePic = profilePic || ""; 
//     user.isProfileComplete = true;

//     await user.save();

//     res.status(200).json({
//       message: "Signup completed successfully",
      
//       user: {
//         id: user._id,
//         email: user.email,
//         name: user.name,
//         profilePic:user.profilePic,
//       },
      
//     });
//   } catch (error) {
//     console.log("COMPLETE SIGNUP ERROR:", error);
//     res.status(500).json({ message: "Signup failed" });
//   }
// };
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//     }

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     if (!user.isProfileComplete) {
//       return res
//         .status(400)
//         .json({ message: "Please complete your signup first" });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const token = jwt.sign(
//       { userId: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.status(200).json({
//       message: "Login successful",
      
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         name: user.name,
//         gender: user.gender,
//         profilePic: user.profilePic,
//       },
      
//     });
//     await AsyncStorage.setItem("user", JSON.stringify(data.user));
//   } catch (error) {
//     console.log("LOGIN ERROR:", error);
//     res.status(500).json({ message: "Login failed" });
//   }
// };

// exports.getUserProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.status(200).json({
//       user: {
//         id: user._id,
//         email: user.email,
//         name: user.name,
//         gender: user.gender,
//         profilePic: user.profilePic,
//         createdAt: user.createdAt,
//       },
//     });
//   } catch (error) {
//     console.log("GET USER PROFILE ERROR:", error);
//     res.status(500).json({ message: "Failed to fetch profile" });
//   }
// };

// exports.logout = async (req, res) => {
//   try {
//     res.status(200).json({ message: "Logged out successfully" });
//   } catch (error) {
//     console.log("LOGOUT ERROR:", error);
//     res.status(500).json({ message: "Logout failed" });
//   }
// };

// exports.updateProfile = async (req, res) => {
//   console.log("Update profile route hit");

//   try {
//     const { name, profilePic, currentPassword, newPassword } = req.body;

//     const user = await User.findById(req.user.id);

//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (name && name.trim().length >= 2) {
//       user.name = name.trim();
//     }

//     if (profilePic !== undefined) {
//       user.profilePic = profilePic;
//     }

//     if (currentPassword && newPassword) {

//       const isMatch = await bcrypt.compare(currentPassword, user.password);

//       if (!isMatch) {
//         return res.status(400).json({ message: "Current password is incorrect" });
//       }

//       if (newPassword.length < 6) {
//         return res.status(400).json({ message: "New password must be at least 6 characters" });
//       }

//       user.password = await bcrypt.hash(newPassword, 10);
//     }

//     await user.save();

//     res.status(200).json({
//       message: "Profile updated successfully",
//       user: {
//         id: user._id,
//         email: user.email,
//         name: user.name,
//         gender: user.gender,
//         profilePic: user.profilePic,
//       },
//     });

//   } catch (error) {
//     console.log("UPDATE PROFILE ERROR:", error);
//     res.status(500).json({ message: "Profile update failed" });
//   }
// };


const User = require("../models/User");
const validateEmail = require("../utils/emailValidator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// ─── Upload Profile Picture ───────────────────────────────────────────────────
exports.uploadProfilePic = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image provided" });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "uniTalk/profiles",
      transformation: [
        { width: 300, height: 300, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    res.status(200).json({
      message: "Image uploaded successfully",
      url: result.secure_url,
    });
  } catch (error) {
    console.log("UPLOAD PROFILE PIC ERROR:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
};

// ─── Verify Email (replaces sendOtp + verifyOtp) ─────────────────────────────
// Just validates the email format — no OTP sent or checked.
// Frontend calls this first, then calls completeSignup if success.
exports.verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check RTU email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Only RTU college emails are allowed",
      });
    }

    // Check if already registered
    const existingUser = await User.findOne({ email, isProfileComplete: true });
    if (existingUser) {
      return res.status(400).json({
        message: "User already registered. Please login instead.",
      });
    }

    // Create or mark user as email-verified so completeSignup can proceed
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, isEmailVerified: true, isProfileComplete: false });
    } else {
      user.isEmailVerified = true;
      await user.save();
    }

    res.status(200).json({
      message: "Email verified successfully",
      email: user.email,
    });
  } catch (error) {
    console.log("VERIFY EMAIL ERROR:", error);
    res.status(500).json({ message: "Email verification failed" });
  }
};

// ─── Complete Signup ──────────────────────────────────────────────────────────
exports.completeSignup = async (req, res) => {
  try {
    const { email, name, gender, password, profilePic } = req.body;

    if (!email || !name || !gender || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email, isEmailVerified: true });

    if (!user) {
      return res.status(400).json({ message: "Email not verified" });
    }

    if (user.isProfileComplete) {
      return res.status(400).json({ message: "Profile already completed" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.name = name;
    user.gender = gender;
    user.password = hashedPassword;
    user.profilePic = profilePic || "";
    user.isProfileComplete = true;

    await user.save();

    res.status(200).json({
      message: "Signup completed successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.log("COMPLETE SIGNUP ERROR:", error);
    res.status(500).json({ message: "Signup failed" });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isProfileComplete) {
      return res.status(400).json({ message: "Please complete your signup first" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        gender: user.gender,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

// ─── Get User Profile ─────────────────────────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        gender: user.gender,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("GET USER PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("LOGOUT ERROR:", error);
    res.status(500).json({ message: "Logout failed" });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, profilePic, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (name && name.trim().length >= 2) {
      user.name = name.trim();
    }

    if (profilePic !== undefined) {
      user.profilePic = profilePic;
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        gender: user.gender,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.log("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Profile update failed" });
  }
};