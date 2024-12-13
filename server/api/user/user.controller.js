const service = require("./user.service")
/// for image
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
///
const { buildSchema } = require("graphql");
const { createHandler } = require("graphql-http/lib/use/express");
const { USER_ROLES } = require("../../config/constants");



exports.createAdminWithCompany = (req, res, next) => {
  return service
    .createAdminWithCompany(req.body, req.user)
    .then((result) => {
      if (result.message === 'Email already exists!') {
         responseHandler.error(res, '', 'Email already exists!', 409)
      } else {
        responseHandler.success(res, result, 'sign up successful!', 200)
      }
    })
    .catch((error) => responseHandler.error(res, error, error.message, 500))
}

exports.createSupportUser = (req, res, next) => {
    return service.createSupportUser(req.body, req.user)
        .then(result => responseHandler.success(res, result, "User Creation successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.userMe = (req, res, next) => {
    return service.userMe(req.user) 
        .then(result => responseHandler.success(res, result, "User fetch successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateMe = (req, res, next) => {
    return service.updateMe(req.body, req.user)
        .then(result => responseHandler.success(res, result, "User update successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}
////

//// 
exports.updateUser = (req, res, next) => {
    return service.updateProfile(req.user._id, req.body)
        .then(result => responseHandler.success(res, result, "User update successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.listUsers = (req, res, next) => {
    return service.listUsers({}, req.user)
        .then(result => responseHandler.success(res, result, "User fetch successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateCompanyDetails = (req, res, next) => {
  return service.updateCompanyDetails(req.body,req.user)
      .then(result => responseHandler.success(res, result, "User update successful!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
}


// exports.listSupport = (req, res, next) => {
//     return service.listUsers({ role: USER_ROLES.SUPPORT }, req.user)
//         .then(result => responseHandler.success(res, result, "Support fetch successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.listSupportAdmin = (req, res, next) => {
//     return service.listUsers({ role: USER_ROLES.SUPPORT_ADMIN }, req.user)
//         .then(result => responseHandler.success(res, result, "Support Admin fetch successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.deleteUser = (req, res, next) => {
//     return service.deleteUser(req.params.id, req.user)
//         .then(result => responseHandler.success(res, result, "User delete successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.restoreUser = (req, res, next) => {
//     return service.restoreUser(req.params.id, req.user)
//         .then(result => responseHandler.success(res, result, "User restore successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.userProfileimguplode = [
//     upload.single('img'),
//     (req, res, next) => {
//       service.uplodeprofileimg({ img: req.file }, req.user)
//         .then(result => responseHandler.success(res, result, "User Upload img successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
//     }
//   ];

// exports.adminSetPassword = (req, res, next) => {
//     return service.adminSetPassword(req.body, req.user)
//         .then(result => responseHandler.success(res, result, "User set password successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.userProfileGqlSchema = createHandler({
//     schema: buildSchema(`
//         type Query {
//             user(profileKeys: [String], userId: String): User
//         }
//         type User {
//             email: String,
//             role: [String],
//             profile: [Profile],
            
//         }
//         type Profile {
//             response: Response,
//             question: Question,
//              profileKey: String,
            
//         }
//         type Response {
//             responseType: String,
//             value: [String]
//         }
//         type Question {
//             _id: String,
//             exclusion:Boolean
//             title: String,
//             subTitle: String,
//             metaTitle: String,
//             description: String,
//             category: String,
//             metaDescription: String,
//             isOptional: Boolean,
//             options: [QuestionOption],
//             isMultiSelect: Boolean,
//             seqNo: Int,
//             images: [String]
//             validation: Validation,
//             profileKey: String
//         }
//         type Validation {
//             min: Int,
//             max: Int
//         }
//         type QuestionOption {
//             name: String,
//             value: String,
//             icon: String,
//             description: String,
//         }
//     `),
//     rootValue: {
//         user: async ({ profileKeys, userId }, request) => {

//             let query = { 
//                 _id: userId
//             }
            
//             let user = await service.findOne(query).populate([{
//                 path: "profile.question"
//             }])
//            // If user is not found, throw an error
//            if (!user) {
//             throw new Error('User not found');
//            }
//            if(profileKeys && profileKeys.length>0){
//             user.profile = user.profile.filter(o => {
//                 return profileKeys.includes(o.profileKey)
//             })
//            }
            

//             return user
//         }
//     },
//     context: req => ({
//         user: req.raw.user
//     }),
//     graphiql: true,
// })

// exports.userProfilemeGqlSchema = createHandler({
//     schema: buildSchema(`
//         type Query {
//             user(profileKeys: [String], userId: String): User
//         }
//         type User {
//             email: String,
//             role: [String],
//             profile: [Profile],
//             profilePic:String,
//         }
//         type Profile {
//             response: Response,
//             question: Question,
//             profileKey: String,
//         }
//         type Response {
//             responseType: String,
//             value: [String]
//         }
//         type Question {
//             _id: String,
//             exclusion:Boolean
//             title: String,
//             subTitle: String,
//             metaTitle: String,
//             description: String,
//             category: String,
//             metaDescription: String,
//             isOptional: Boolean,
//             options: [QuestionOption],
//             isMultiSelect: Boolean,
//             seqNo: Int,
//             images: [String]
//             validation: Validation,
//             profileKey: String
//         }
//         type Validation {
//             min: Int,
//             max: Int
//         }
//         type QuestionOption {
//             name: String,
//             value: String,
//             icon: String,
//             description: String,
//         }
//     `),
//     rootValue: {
//         user: async ({ profileKeys, userId }, request) => {

//             let query = { 
//                 _id: request.user._id
//             }
//             // if (request.user.role[0] == USER_ROLES.SUPER_ADMIN && userId) {
//             //     query._id = userId
//             // }

//             let user = await service.findOne(query).populate([{
//                 path: "profile.question"
//             }])
//            if(profileKeys && profileKeys.length>0){
//             user.profile = user.profile.filter(o => {
//                 return profileKeys.includes(o.profileKey)
//             })
//            }
            

//             return user
//         }
//     },
//     context: req => ({
//         user: req.raw.user
//     }),
//     graphiql: true,
// })



