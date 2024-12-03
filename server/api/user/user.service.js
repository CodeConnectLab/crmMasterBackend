const UserModel = require('./user.model')
const {
  getHashedPassword,
  generateSalt,
  generatePassword,
  generateCompanyCode
} = require('../../utility/util')
const verificationTokensService = require('../verificationTokens/verificationTokens.service')
const { USER_ROLES } = require('../../config/constants')
const activityService = require('../activity/activity.service')
const authService = require('../auth/auth.service')
const userModel = require('./user.model')
const companyModel =require('../company/company.model')
const checkPermission = require('../../utility/permissionCheck')
const fs = require('fs')

//
const AWS = require('aws-sdk')
const { getPresignedUrl } = require('../../helpers/aws-s3.helper')
const { error } = require('console')
///

/**
 * To create User
 * @author Dev Team
 */


const checkExistingUser = async (email, phone) => {
  // Check email if provided
  if (email) {
    const existingUserEmail = await userModel.findOne({ email: email.toLowerCase() });
    if (existingUserEmail) {
      const error = new Error('Email already registered');
      // error.code = 409;
      // error.field = 'email';
      throw error;
    }
  }

  // Check phone if provided
  if (phone) {
    const existingUserPhone = await userModel.findOne({ phone });
    if (existingUserPhone) {
      const error = new Error('Phone number already registered');
      // error.code = 409;
      // error.field = 'phone';
      throw error;
    }
  }
};

////////  creat Admin With Company
exports.createAdminWithCompany = async ({companyData, userData, ipaddress},user) => {   
  const session = await companyModel.startSession();
  session.startTransaction();
  try {
    // Validate user data before starting transaction
    await checkExistingUser(userData.email, userData.phone);
    // Generate company code
    const companyCode = await generateCompanyCode();

    // Create company
    const company = await companyModel.create([{
      ...companyData,
      code: companyCode,
      status: 'active',
      subscription: {
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
        status: 'trial'
      }
    }], { session });
    // Generate password hash
    const hashSalt = generateSalt();
    const hashedPassword = getHashedPassword(userData.password, hashSalt);
    // Create admin user
    const user = await userModel.create([{
      ...userData,
      companyId: company[0]._id,
      role: USER_ROLES.SUPER_ADMIN,
      hashedPassword,
      hashSalt,
      isEmailVerified: false,
      isMobileVerified: false,
      isActive: true,
      ipaddress,
      isPrime: false,
    }], { session });

    // Update company with created by
    await companyModel.findByIdAndUpdate(
      company[0]._id,
      { createdBy: user[0]._id },
      { session }
    );
    // Generate tokens
    let { token, refreshToken } = await authService.generateToken(user[0])            
    await session.commitTransaction(); 
    const responseData = {
      company:  company[0],
      user: {
        id: user[0]._id,
        name: user[0].name,
        email: user[0].email,
        phone: user[0].phone,
        role: user[0].role,
        isActive:user[0].isActive,
        isPrime: user[0].isPrime,
        isEmailVerified:user[0].isEmailVerified,
        isMobileVerified:user[0].isMobileVerified,
        profilePic:'https://crm.codeconnect.in/',
      },
      token: token.token,
      refreshToken: refreshToken.token
    };
    return responseData;
  } catch (error) {
    return Promise.reject(error)
  }
}



exports.createSupportUser = async ({name, email, role, password,phone,isActive }, user) => {
  try {   
    let emailExists = await UserModel.find({ email }).lean()
    if (emailExists.length) throw 'Email already exists!'
     let phoneExists = await UserModel.find({ phone }).lean()
    if (phoneExists.length) throw 'Phone already exists!'
    let randPassword = password || generatePassword()
    let userSalt = generateSalt()
    let createdUser = await UserModel.create({
      name,
      email,
      role: role,
      phone,
      isActive,
      hashedPassword: getHashedPassword(randPassword, userSalt),
      passowrdExpiry: new Date(new Date().setDate(new Date().getDate() + 10)),
      hashSalt: userSalt,
      companyId:user.companyId
      // activities: activityService.getActivityForRole(USER_ROLES.SUPPORT_ADMIN)
    })
    return {
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      _id: createdUser._id,
      phone: createdUser.phone,
      isActive:createdUser.isActive,
      isPrime: createdUser.isPrime,
      isEmailVerified:createdUser.isEmailVerified,
      isMobileVerified:createdUser.isMobileVerified,
      profilePic:'https://crm.codeconnect.in/',
    }
  } catch (error) {
    return Promise.reject(error)
  }
}



exports.findOne = (query) => {
  return UserModel.findOne(query)
}

exports.userMe = async (user) => {
  return UserModel.findById(user._id).select({
    hashedPassword: 0,
    passowrdExpiry: 0,
    otp: 0,
    otpExpiry: 0,
    activities: 0,
    hashSalt: 0,
    __v: 0
  })
}

exports.updateMe= async ({name,bio},user)=>{
   const data={name,bio}
   return UserModel.findByIdAndUpdate(user._id,{$set:data},{new:true,
    select: '-hashedPassword -hashSalt -otp -otpExpiry -resetPasswordToken'});
}

exports.updateOne = async (
  userId,
  { firstName, lastName, phone, isActive }
) => {
  return UserModel.findOneAndUpdate(
    {
      _id: userId
    },
    {
      firstName,
      lastName,
      phone,
      isActive
    }
  )
}



exports.updateProfile = async (userId, updateObj) => {
  try {
    let user = await userModel.findById(userId)

    let userProfile = user.profile
   // console.log("updateObj",updateObj)
    for (let profileItem of userProfile) {
      // console.log(updateObj[profileItem.profileKey], profileItem.profileKey)
      if (updateObj[profileItem.profileKey]) {
        profileItem.response.value = updateObj[profileItem.profileKey].value
        profileItem.response.responseType =
          updateObj[profileItem.profileKey].responseType

          if (profileItem.profileKey === 'name') {
            user.name = updateObj[profileItem.profileKey].value[0]
          }
      }
    }

    return user.save()
  } catch (error) {
    return Promise.reject(error)
  }
}

// exports.listUsers = async ({ role }, user) => {
//   return UserModel.find(
//     {
//       role
//     },
//     {
//       firstName: 1,
//       lastName: 1,
//       phone: 1,
//       isActive: 1,
//       isPrime: 1,
//       role: 1,
//       email: 1,
//       deleted: 1,
//       profile: 1,
//       bmi:1,
//     }
//   )
// }

// exports.deleteUser = async (userID, user) => {
//   /// update code for permission
//   const user2 = await UserModel.findOne({ _id: userID }).select('role')
//   const role1 = user2 ? user2.role[0] : null
//   if (user.role[0] !== USER_ROLES.SUPER_ADMIN) {
//     if (role1 == USER_ROLES.SUPPORT_ADMIN) {
//       await checkPermission(user.role[0], 'admin', 'delete')
//     }
//     if (role1 == USER_ROLES.SUPPORT) {
//       await checkPermission(user.role[0], 'support', 'delete')
//     }
//     if (role1 == USER_ROLES.USER) {
//       await checkPermission(user.role[0], 'users', 'delete')
//     }
//   }
//   /// update code for permission
//   return UserModel.updateOne(
//     {
//       _id: userID
//     },
//     {
//       deleted: true,
//       deletedBy: user._id,
//       deletedAt: new Date()
//     }
//   )
// }


///  profile image upload  
// exports.uplodeprofileimg = async ({ img }, user) => {
//   if (!img || !img.path || !img.originalname) {
//     throw new Error('Invalid image provided')
//   }
//   try {
//     const Url = await getPresignedUrl(img, img.mimetype)
//     if (!Url) {
//       throw new Error('Error uploading image to S3')
//     }
//     const updatedUser = await userModel.findByIdAndUpdate(
//       user._id,
//       { profilePic: Url },
//       { new: true }
//     )
//     fs.unlinkSync(img.path)
//     if (!updatedUser) {
//       throw new Error('Error updating user profile image')
//     }

//     return updatedUser
//   } catch (error) {
//     console.error('Error uploading image:', error)
//     if (fs.existsSync(img.path)) {
//       fs.unlinkSync(img.path)
//     }
//     throw new Error('Error uploading image to S3')
//   }
// }

// exports.restoreUser = async (userID, user) => {
//   const user2 = await UserModel.findOne({ _id: userID }).select('role')
//   const role1 = user2 ? user2.role[0] : null
//   if (user.role[0] !== USER_ROLES.SUPER_ADMIN) {
//     if (role1 == USER_ROLES.SUPPORT_ADMIN) {
//       await checkPermission(user.role[0], 'admin', 'delete')
//     }
//     if (role1 == USER_ROLES.SUPPORT) {
//       await checkPermission(user.role[0], 'support', 'delete')
//     }
//     if (role1 == USER_ROLES.USER) {
//       await checkPermission(user.role[0], 'users', 'delete')
//     }
//   }
//   return UserModel.updateOne(
//     {
//       _id: userID
//     },
//     {
//       deleted: false,
//       deletedBy: user._id,
//       deletedAt: new Date()
//     }
//   )
// }

// exports.adminSetPassword = async ({ userId, password }, user) => {
//   try {
//     /// update code for permission
//     const user1 = await UserModel.findOne({ _id: userId }).select('role')
//     const role = user1 ? user1.role[0] : null
//     if (user.role[0] !== USER_ROLES.SUPER_ADMIN) {
//       if (role == USER_ROLES.SUPPORT_ADMIN) {
//         await checkPermission(user.role[0], 'admin', 'edit')
//       }
//       if (role == USER_ROLES.SUPPORT) {
//         await checkPermission(user.role[0], 'support', 'edit')
//       }
//     }
//     /// update code for permission
//     let userObj = await UserModel.findOne({ _id: userId }).lean()
//     return UserModel.updateOne(
//       {
//         _id: userId
//       },
//       {
//         hashedPassword: getHashedPassword(password, userObj.hashSalt),
//         passowrdExpiry: new Date(new Date().setDate(new Date().getDate() + 50))
//       }
//     )
//   } catch (error) {
//     return Promise.reject(error)
//   }
// }
