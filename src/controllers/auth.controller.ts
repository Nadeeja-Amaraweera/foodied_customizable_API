import { Request, Response } from "express";
import { UserModel, UserRole } from "../models/user.model";
import { OrderModel } from "../models/order.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import { signAccessToken, signRefreshToken } from "../util/jwt";
import { AuthRequest } from "../middlewares/auth";
import dotenv from "dotenv"
import { OAuth2Client } from "google-auth-library";
import axios from "axios";

dotenv.config()

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register Controller
export const register = async (req:Request, res:Response) => {
    try {
        const {name, email, password} = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required"
            });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const extUser = await UserModel.findOne({ email: normalizedEmail });
        if (extUser) {
            return res.status(400).json({
                message: "User already exists..."
            });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(password, salt);

        const newUser = new UserModel({
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashPassword,
            roles: [UserRole.USER]
        });
        await newUser.save();
        return res.status(201).json({
            message: "User Registerd successfully"
        });

    } catch (err: any) {
        console.log(err);
        if (err && err.code === 11000) {
            return res.status(400).json({
                message: "User already exists..."
            });
        }
        if (err && err.name === 'ValidationError') {
            const validationMessages = Object.values(err.errors).map((e: any) => e.message).join(', ');
            return res.status(400).json({
                message: validationMessages
            });
        }
        return res.status(500).json({
            message: "Registration fail",
            error: err?.message || err
        });
    }
}

// Login Controller
export const login = async (req:Request,res:Response) => {
    const {email , password} = req.body

    if (!email || !password) {
        return res.status(400).json({
            message:"missing data...!"
        })
    }
    try {
        const user = await UserModel.findOne({email})
        if (!user) {
            return res.status(401).json({
                message:"Email not found...!"
            })
        }

        if (!user.password) {
            return res.status(400).json({
                message: "Password is missing...!"
            })
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return res.status(401).json({
                message:"Wrong Password...!"
            })
        }

        const accessToken = signAccessToken(user)
        const refreshToken = signRefreshToken(user)

        res.status(200).json({
            message:"OK",
            data:{
                id: user._id,
                name: user.name,
                email:user.email,
                roles:user.roles,
                access_token: accessToken,
                refresh_token: refreshToken
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message:"Internal Server error while login"
        })
    }
}

// Get User Details Controller
export const getMyDetails = async (req: AuthRequest, res: Response) => {

    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    const user = await UserModel.findById(req.user.sub).select("-password")
    if (!user) {
        return res.status(401).json({
            message:"User not found"
        })
    }
    
    const {email, roles, _id, name} = user

    res.status(200).json({
        message: "OK",
        data:
        {
            id:_id,
            name,
            email,
            roles
        }
    })
    
}

// Refresh controller
export const refreshToken = async (req:Request, res:Response) => {
    const {refreshToken} =  req.body

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET as string
        ) as {sub:string}

        const user = await UserModel.findById(decoded.sub)

        if (!user) {
            return res.status(401).json({ message: "User Not found" });
        }

        const newAccessToken = signAccessToken(user)

        res.status(200).json({
            message:"Token Refreshed",
            data:{
                access_token : newAccessToken
            }
        })

    } catch (error) {
        console.error(error)
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }
}

// Admin Login
export const adminLogin = async (req:Request, res:Response) => {
    const {email, password} = req.body

    if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
    }

    try {
        const user = await UserModel.findOne({email})

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.roles?.includes(UserRole.ADMIN)) {
            return res.status(403).json({ message: "Access denied. Admin only." });
        }

        if (!user.password) {
             return res.status(400).json({ message: "Password missing" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        res.status(200).json({
            message: "Admin Login OK",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                roles: user.roles,
                access_token: accessToken,
                refresh_token: refreshToken
            }
        });


    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

// Google login
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const googleResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { email, name, picture, sub } = googleResponse.data;

    let user = await UserModel.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = sub;
        await user.save();
      }
    } else {
      user = await UserModel.create({
        name: name || 'Google User',
        email,
        googleId: sub,
        roles: [UserRole.USER],
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(200).json({
      message: "Google login successful",
      data: {
        id: user._id,
        email: user.email,
        roles: user.roles,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });

  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ message: "Invalid Google token" });
  }
};

// Get all registered users/customers with order stats
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.find().select('-password').sort({ createdAt: -1 });

    const orderStats = await OrderModel.aggregate([
      {
        $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$placedAt' },
        },
      },
    ]);

    const statsMap = new Map<string, any>();
    orderStats.forEach((stat) => {
      if (stat._id) {
        statsMap.set(stat._id.toString(), stat);
      }
    });

    const enrichedUsers = users.map((u) => {
      const stats = statsMap.get(u._id.toString());
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        roles: u.roles || [UserRole.USER],
        googleId: u.googleId,
        createdAt: (u as any).createdAt,
        totalOrders: stats ? stats.totalOrders : 0,
        totalSpent: stats ? stats.totalSpent : 0,
        lastOrderDate: stats ? stats.lastOrderDate : null,
      };
    });

    res.status(200).json({
      message: 'Users retrieved successfully',
      data: enrichedUsers,
    });
  } catch (error: any) {
    console.error('[getAllUsers] Error:', error);
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
};

// Authenticated user: Update profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name.trim();
    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error: any) {
    console.error('[updateProfile] Error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};