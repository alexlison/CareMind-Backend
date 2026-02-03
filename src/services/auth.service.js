import user from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";



export const registerCaregiverService = async(data) => {

    const { name,email,phone,password,address,gender } = data;

    const emailExists = await user.findOne({
        "caregiver.email":email,
    });


if(emailExists){

    const error = new Error("Email Id Already Exists");
    error.statusCode = 409;
    throw error;
}

const phoneExists = await user.findOne({
    "caregiver.phone":phone,

});

if(phoneExists){

    const error = new Error("Phone No Already Exists");
    error.statusCode = 409;
    throw error;
}

const hashedPassword = await bcrypt.hash(password,10);

const caregiver = await user.create({
    role:"caregiver",
    caregiver: {
        name,
        email,
        phone,
        password:hashedPassword,
        gender,
        address,
    }

 });

 return caregiver;

}


// Login Service

export const loginService = async(email, password) => {
    let userData = await user.findOne({
        "caregiver.email": email,
        isActive: true
    });

    let userType = "caregiver";
    
    if (!userData) {
        userData = await user.findOne({
            "admin.email": email,
            isActive: true
        });
        userType = "admin";
    }

    if (!userData) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const storedPassword = userData[userType].password;
    const isPasswordValid = await bcrypt.compare(password, storedPassword);
    
    if (!isPasswordValid) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const tokenData = {
        userId: userData._id,
        role: userData.role,
        email: userData[userType].email,
        name: userData[userType].name
    };

    const token = jwt.sign(
        tokenData, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const userResponse = {
        _id: userData._id,
        role: userData.role,
        isActive: userData.isActive,
        ...userData[userType].toObject()
    };

    delete userResponse.password;

    return {
        user: userResponse,
        token: token
    };
}