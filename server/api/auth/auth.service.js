const userService = require("../user/user.service");
const { getHashedPassword, generateSalt, generateOTP } = require("../../utility/util")
const jwtHelper = require("../../helpers/jwt.helper");
const { USER_ROLES } = require("../../config/constants")
const mailer = require("../../mailer/index")
const verificationTokensService = require("../verificationTokens/verificationTokens.service");
const userModel = require("../user/user.model");
const OTPVerification = require("./otpVerification");


exports.logIn = async (res,{
    email,
    phone,
    password,
    otp,
    fcmMobileToken,
    fcmWebToken
  }) => {
    try {
      if (!otp && !password) throw 'Credentials missing!';
  
      // Find user by email or phone with company details
      const query = email ? { email } : { phone };
      let maybeUser = await userService.findOne(query)
        .populate({
          path: 'companyId',
          model: 'company', // Make sure this matches the model name
          //select: 'code name status subscription'
        })
        .lean();
     

        
        if (!maybeUser){
          return res.status(200).json({ message: 'Invalid credentials' });
        }
        // Check if user is verified
        if (!maybeUser.isActive) {
          return res.status(200).json({ message: 'User is not Active' });
        }

      // if (!maybeUser) throw "User doesn't exist";
      // if (maybeUser?.isActive) throw "User is not Active";
  
      // Password authentication
      if (password) {
        let hashedPassword = getHashedPassword(password, maybeUser.hashSalt);
        //if (hashedPassword != maybeUser.hashedPassword) throw "Wrong Password!";
        if (hashedPassword != maybeUser.hashedPassword){
          return res.status(200).json({ message: 'Wrong Password!' });
        }
        //if (maybeUser.passwordExpiry < new Date()) throw 'Password Expired!';
        if (maybeUser.passwordExpiry < new Date()){//401
          return res.status(200).json({ message: 'Password Expired!' });
        }
      }
  
      // OTP authentication
      if (otp) {
        let hashedOtp = getHashedPassword(otp, maybeUser.hashSalt);
        if (hashedOtp != maybeUser.otp) throw "Invalid OTP!";
        if (maybeUser.otpExpiry < new Date()) throw 'OTP Expired!';
      }
  
      // Check existing login
      let isUserAlreadyLoggedIn = await verificationTokensService.checkUserLoggedIn(maybeUser._id);
  
      if (isUserAlreadyLoggedIn) {
        // if already logged in remove all tokens
        await verificationTokensService.revokeAllTokenForUser(maybeUser._id);
      }
  
      // Generate new tokens
      let { token, refreshToken } = await generateToken({
        _id: maybeUser._id,
        role: maybeUser.role,
        companyId: maybeUser.companyId._id
      });
  
      // Update last login
      await userModel.findByIdAndUpdate(maybeUser._id, {
        $set: {
          fcmMobileToken,
          fcmWebToken,
          lastLogin: new Date(),
          loginAttempts: 0
        }
      });
      return {
         user: {
            _id: maybeUser._id,
            name: maybeUser.name,
            email: maybeUser.email,
            phone: maybeUser.phone,
            companyCode: maybeUser.companyId.code,
            role: maybeUser.role,
            isEmailVerified: maybeUser.isEmailVerified || false,
            isMobileVerified: maybeUser.isMobileVerified || false,
            bio: maybeUser.bio,
            profilePic:maybeUser?.profilePic,
            fcmMobileToken:maybeUser?.fcmMobileToken,
            fcmWebToken:maybeUser?.fcmWebToken,
            company:maybeUser?.companyId
          },
          androidVersion : "v1.0.0",
          iosversion : "v1.0.0",
          mobileApkDownlodeLink:'https://crm.page.codeconnect.in/app-download',
          token: token.token,
          refreshToken: refreshToken.token
        }
     } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
  };

exports.refresh = async (body, refreshToken) => {
    try {
        let tokenObj = await verificationTokensService.checkRefreshToken(refreshToken)

        if (!tokenObj) throw 'Invalid Token!'

        let userObj = await userService.findOne({
            _id: tokenObj.user
        }).select("_id role")

        if (!userObj) throw 'Invalid User!'

        // revoke all tokens for the user
        await verificationTokensService.revokeAllTokenForUser(userObj._id)

        let { token, refreshToken: newRefreshToken } = await generateToken(userObj)

        return {
            user: {
                email: userObj.email,
                role: userObj.role,
            },
            token: token.token,
            refreshtoken: newRefreshToken.token
        }

    } catch (error) {
        return Promise.reject(error)
    }
}

exports.isAuthenticated = ({ skipAuth, adminOnly,adminandsupport,logout }) => {
    return async (req, res, next) => {
        try {
            let token = req.headers.authorization
           
            if (skipAuth && !token) {
                return next();
            }

            if(logout){
               await jwtHelper.logout(token);
            }
           
            if (!token) throw "Authentication token not found!"
             let tokenData = await jwtHelper.verify(token, process.env.SESSION_SECRET);
            let userQuery = {
                _id: tokenData._id
            }
            let userObj = await userService.findOne(userQuery);
             
            if (!userObj) throw "Unauthourized!"
            if (adminOnly == true && (userObj.role != USER_ROLES.SUPER_ADMIN && userObj.role != USER_ROLES.SUPPORT_ADMIN)) {
                throw "Unauthourized!"
            }
             // access also for support with admin
            if (adminandsupport == true && (userObj.role != USER_ROLES.SUPER_ADMIN
                 && userObj.role[0] != USER_ROLES.SUPPORT_ADMIN && userObj.role[0] != USER_ROLES.SUPPORT)) {
                throw "Unauthourized!"
            } 
              // access also for support with admin
            req.user = userObj
            next()
        } catch (error) {
            return responseHandler.error(res, error, error.message, 401)
        }
    }
}

async function generateToken(user) {
    try {
        let token = await verificationTokensService.registerToken({
            data: {
                _id: user._id,
                role: user.role,
                companyId:user.companyId
            },
            secret: process.env.SESSION_SECRET,
            type: 'auth'
        }, user)
      
        let refreshToken = await verificationTokensService.registerToken({
            data: {
                _id: user._id,
                role: user.role,
                companyId:user.companyId
            },
            secret: process.env.REFRESH_SECRET,
            type: 'refresh',
            expiresIn: {
                expiresIn: '4d'
            }
        }, user)

        return { token, refreshToken }
    } catch (error) {
        return Promise.reject(error)
    }
}
exports.generateToken = generateToken

exports.requestOTP = async ({ email ,deviceToken ,targetPlatform ,ipaddress}) => {
    try {
        let userExist = await userService.findOne({ email: email });

        if (!userExist) throw 'User doesn`t exist!'
        if (!userExist.isActive) {
          throw new Error('This account is inactive. Please contact support.');
        }
        
          // Generate OTP
  const otp = generateOTP(6);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save OTP in database
  await OTPVerification.findOneAndUpdate(
    { email },
    {
      email,
      otp,
      expiryTime: otpExpiry,
    },
    { upsert: true, new: true }
  );


  // return { email, otp };
        

        mailer.sendMail({
            templateName: "login-otp",
            toEmail: email,
            locals: {
                otp: otp
            },
        }).then().catch()
        
    } catch (error) {
        return Promise.reject(error)
    }
}

exports.verifyOtp = async ({email, otp})=>{
  try {
    const otpRecord = await OTPVerification.findOne({
      email: email,
      otp: otp,
      expiryTime: { $gt: new Date() },
    });
    if (!otpRecord) {
      throw new Error('Invalid OTP or OTP has expired');
    }
    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();
    return { email: email };
  } catch (error) {
    return Promise.reject(error)
  }
  
}

exports.resetPassword= async ({email,newPassword,confirmPassword})=>{
         // Check if OTP was verified
  const otpRecord = await OTPVerification.findOne({
    email: email,
    isVerified: true,
    expiryTime: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new Error('Invalid session or session expired');
  }

  const user = await userModel.findOne({ email: email });
  if (!user) {
    throw new Error('No user found with this email address');
  }

  try {
    const hashSalt = generateSalt();
    const hashedPassword = getHashedPassword(newPassword, hashSalt);

    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      {
        $set: {
          hashedPassword,
          hashSalt,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user password');
    }

    // Clear OTP record
    await OTPVerification.deleteOne({ email: email });

    return {
      email: updatedUser.email,
      updatedAt: updatedUser.updatedAt,
    };

  }catch (error) {
    return Promise.reject(error)
}
}