const { USER_ROLES } = require("../../config/constants")
const activities = require("./activity.json");

exports.getActivityForRole = (userRole) => {
    switch(userRole) {
        case USER_ROLES.SUPER_ADMIN: {
            return Object.values(activities)
        } 
        case USER_ROLES.SUPPORT_ADMIN: {
            return [
                activities.create_survey,
                activities.create_user,
                activities.create_support,
                activities.create_policy,
                activities.create_content,
                activities.create_subscription,
                activities.read_support,
                activities.read_user,
                activities.can_approve_user_post
            ]
            
        } 
        case USER_ROLES.SUPPORT: {
            return [
                activities.read_user,
                activities.read_supportread_user,
            ]
        }
        case USER_ROLES.USER: {
            return [ ]
        }
        default: throw "Invalid Role!";
    }
}