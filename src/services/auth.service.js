import user from "../models/user.js";


export const registerCaregiverService = async(data) => {

    const { name,email,phone,password,relationship,address } = data;

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

const caregiver = await user.create({
    role:"caregiver",
    caregiver: {
        name,
        email,
        phone,
        password,
        relationship,
        address,
    }

 });

 return caregiver;

}
