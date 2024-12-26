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
// const fs = require('fs')
const fs = require('fs').promises;
//
const AWS = require('aws-sdk')
const { getPresignedUrl } = require('../../helpers/aws-s3.helper')
const { error } = require('console')
const userRoles = require('../../config/constants/userRoles')
const { uploadToS3 } = require('../../helpers/aws-s3.helper');
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



exports.createSupportUser = async ({name, email, role, password,phone,isActive,assignedTL }, user) => {
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
      assignedTL,
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

exports.updateProfileImg = async (data, user) => {
  try {    

    const fileBuffer = await fs.readFile(data.filePath)
    const fileObj = {   
      originalname: data.originalName,  
      buffer: fileBuffer,
      mimetype: 'image/png'
    }
    const s3Upload = await uploadToS3(fileObj ,folder='profile-image')
    const uplode = { profilePic: s3Upload.url }   

    const userdata= UserModel.findByIdAndUpdate(
      user._id,
      { $set: uplode },
      { new: true,
        select: '-hashedPassword -hashSalt -otp -otpExpiry -resetPasswordToken'
       }
    )
  
     // Optionally cleanup the local file
     try {
      await fs.unlink(data.filePath);
    } catch (cleanupError) {
      console.error('Error cleaning up local file:', cleanupError);
      // Don't throw error for cleanup failures
    }
   return userdata;

  } catch (error) {
    return Promise.reject(error)
  }
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


//////// update company detail
exports.updateCompanyDetails = async (updateData, user) => {
  try {
    // Find existing company
    const existingCompany = await companyModel.findOne({
      _id: user.companyId,
      deleted: false
    });

    if (!existingCompany) {
      const error = new Error('Company not found');
      error.status = 404;
      return Promise.reject(error);
    }

    // Prepare update data
    const finalUpdateData = {
      ...updateData,
      settings: updateData.settings ? {
        dateFormat: updateData.settings.dateFormat || existingCompany.settings.dateFormat,
        timezone: updateData.settings.timezone || existingCompany.settings.timezone,
        currency: updateData.settings.currency || existingCompany.settings.currency,
        language: updateData.settings.language || existingCompany.settings.language,
        fiscalYearStart: updateData.settings.fiscalYearStart || existingCompany.settings.fiscalYearStart
      } : existingCompany.settings,
      subscription: updateData.subscription ? {
        plan: updateData.subscription.plan || existingCompany.subscription.plan,
        startDate: updateData.subscription.startDate || existingCompany.subscription.startDate,
        endDate: updateData.subscription.endDate || existingCompany.subscription.endDate,
        status: updateData.subscription.status || existingCompany.subscription.status,
        features: updateData.subscription.features || existingCompany.subscription.features
      } : existingCompany.subscription,
      primaryContact: updateData.primaryContact ? {
        name: updateData.primaryContact.name,
        email: updateData.primaryContact.email,
        phone: updateData.primaryContact.phone
      } : existingCompany.primaryContact,
      updatedBy: user._id,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(finalUpdateData).forEach(key => 
      finalUpdateData[key] === undefined && delete finalUpdateData[key]
    );

    // Update company
    return await companyModel.findOneAndUpdate(
      {
        _id: user.companyId,
        deleted: false
      },
      {
        $set: finalUpdateData
      },
      {
        new: true,
        runValidators: true
      }
    );

  } catch (error) {
    if (error.isJoi) {
      error.message = error.details[0].message;
    }
    return Promise.reject(error);
  }
};

exports.listUsers = async ({ }, user) => {
  if (user.role == userRoles.SUPER_ADMIN) {
    return UserModel.find(
      {
        companyId:user.companyId
      },  // Empty filter to get all users                "_id": "67543db20b51b00959c6eb3b",
      {
        name: 1,
        email: 1,
        role: 1,
        assignedTL: 1,
        companyId: 1,
        phone: 1,
        isEmailVerified: 1,
        isMobileVerified: 1,
        isActive: 1,
        deleted: 1,
        createdAt: 1,
      }
    );
  }
  /////// for employees 
  if (user.role == userRoles.USER) {
    return UserModel.find(
      {
        _id: user._id,  // Filter by the current user's ID
        companyId:user.companyId
      },
      {
        name: 1,
        email: 1,
        role: 1,
        companyId: 1,
        phone: 1,
        isEmailVerified: 1,
        isMobileVerified: 1,
        isActive: 1,
        deleted: 1,
        createdAt: 1,
      }
    );
  }
/////// for Team Leader 
  if(user.role == userRoles.TEAM_ADMIN){
    return UserModel.find(
      {
        companyId: user.companyId,
        $or: [
          { assignedTL: user._id },  // Get all team members
          { _id: user._id }          // Get team leader's own profile
        ]
      },
      {
        name: 1,
        email: 1,
        role: 1,
        assignedTL: 1,
        companyId: 1,
        phone: 1,
        isEmailVerified: 1,
        isMobileVerified: 1,
        isActive: 1,
        deleted: 1,
        createdAt: 1,
      }
    );
  }

};


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










