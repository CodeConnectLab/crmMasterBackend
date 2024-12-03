const verificationTokenModel = require("./verificationTokens.model")
const jwtHelper = require("../../helpers/jwt.helper")

const TokenTypes = {
    AUTH: "auth",
    REFRESH: 'refresh'
}

exports.registerToken = async ({
    data,
    type,
    secret,
    expiresIn
}, user) => {
    try {
        let token = await jwtHelper.sign(data, secret, expiresIn ?? {
            expiresIn: '1d'
        })

        return verificationTokenModel.create({
            tokenType: type,
            token: token,
            user: user
        })

    } catch (error) {
        return Promise.reject(error)
    }
}

exports.validateToken = async (token, secret, user) => {
    try {
        let tokenObj = await verificationTokenModel.findOne({
            deleted: false,
            token: token
        })

        if(!tokenObj) throw "Invalid token!"

        let data = await jwtHelper.verify(token, secret)

        return data
    } catch (error) {
        return Promise.reject(error)
    }
}

exports.checkUserLoggedIn = async (userId) => {
    return verificationTokenModel.findOne({
        user: userId,
        tokenType: 'auth',
        deleted: false
    })
}

exports.revokeAllTokenForUser = async (userId) => {
    return verificationTokenModel.updateMany({ 
        user: userId 
    }, {
        deleted: true
    })
}

exports.checkRefreshToken = async (token) => {
    return verificationTokenModel.findOne({
        deleted: false,
        token,
        tokenType: 'refresh'
    })
}