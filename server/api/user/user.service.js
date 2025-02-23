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

exports.updateDepartment = async (contentId, { name, bio, isActive, assignedTL, password, email, phone }, user) => {
  try {
      // First check if user exists
      const existingUser = await UserModel.findById(contentId);
      if (!existingUser) {
          throw new Error('User not found');
      }

      // Check email uniqueness only if email is being updated
      if (email && email !== existingUser.email) {
          const emailExists = await UserModel.findOne({ 
              email,
              _id: { $ne: contentId }  // Exclude current user from check
          }).lean();
          
          if (emailExists) {
              throw new Error('Email already exists for another user!');
          }
      }

      // Check phone uniqueness only if phone is being updated
      if (phone && phone !== existingUser.phone) {
          const phoneExists = await UserModel.findOne({ 
              phone,
              _id: { $ne: contentId }  // Exclude current user from check
          }).lean();
          
          if (phoneExists) {
              throw new Error('Phone number already exists for another user!');
          }
      }

      // Prepare update data
      const updateData = {
          ...(name && { name }),
          ...(bio && { bio }),
          ...(isActive !== undefined && { isActive }),
          ...(assignedTL && { assignedTL }),
          ...(email && { email }),
          ...(phone && { phone })
      };

      // Handle password update if provided
      if (password) {
          const userSalt = generateSalt();
          updateData.hashedPassword = getHashedPassword(password, userSalt);
          updateData.hashSalt = userSalt;
          updateData.passwordExpiry = new Date(new Date().setDate(new Date().getDate() + 10));
      }

      // Update user with validated fields using contentId
      const updatedUser = await UserModel.findByIdAndUpdate(
          contentId,  // Using contentId instead of user._id
          { $set: updateData },
          {
              new: true,
              select: '-hashedPassword -hashSalt -otp -otpExpiry -resetPasswordToken',
              runValidators: true
          }
      );

      if (!updatedUser) {
          throw new Error('Error updating user');
      }

      return updatedUser;

  } catch (error) {
      throw error.message || 'Error updating user';
  }
};

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




/////////// update device token 
exports.updateDeviceToken = async({fcmWebToken, fcmMobileToken}, user) => {
  try {
      const finalUpdateData = {
          fcmWebToken,
          fcmMobileToken
      };

      const data= await UserModel.findOneAndUpdate(
          {
              _id: user?._id, // Find user by ID
              companyId: user?.companyId, // Ensure it's under the correct company
          },
          {
              $set: finalUpdateData // Update the FCM tokens
          },
          {
              new: true, // Return the updated document
              runValidators: true // Ensure validation rules are applied
          }
      );
        return {message:'Device Token update successful!'} 
  } catch (error) {
      return Promise.reject(error); // Return rejected promise on error
  }
};

//////////  user list

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

const LeadModel = require('../lead/lead.model');
const mongoose = require('mongoose');

exports.deleteUser = async (req, { deleteUserId, LeadassigenUserId }, user) => {
    let session;
    try {
        // Start transaction
        session = await mongoose.startSession();
        session.startTransaction();

        // Find user to delete
        const userToDelete = await UserModel.findById(deleteUserId);
        if (!userToDelete) {
            throw {
                status: 404,
                message: 'User not found'
            };
        }

        if (LeadassigenUserId) {
            // Validate if assignee user exists
            const assigneeUser = await UserModel.findById(LeadassigenUserId);
            if (!assigneeUser) {
                throw {
                    status: 404,
                    message: 'Assignee user not found'
                };
            }

            // Update all leads assigned to deleted user
            await LeadModel.updateMany(
                { assignedAgent: deleteUserId },
                { assignedAgent: LeadassigenUserId },
                { session }
            );
        }

        // Delete the user
        await UserModel.findByIdAndDelete(deleteUserId, { session });

        // Commit the transaction
        await session.commitTransaction();

        return {
            status: 200,
            message: 'User deleted successfully'
        };

    } catch (error) {
        // Rollback transaction on error
        if (session) {
            await session.abortTransaction();
        }

        // Handle specific errors
        if (error.status) {
            return {
                status: error.status,
                message: error.message
            };
        }

        // Handle unexpected errors
        console.error('Error in deleteUser:', error);
        return {
            status: 500,
            message: 'Internal server error'
        };

    } finally {
        // End session
        if (session) {
            await session.endSession();
        }
    }
};










