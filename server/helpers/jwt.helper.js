const jwt = require("jsonwebtoken")

exports.sign = (payload, secret, opts) => {
    return jwt.sign(payload, secret, opts)
}

exports.verify = (token, secret) => {
    if (blacklist.has(token)) {
        throw new Error("Token is expired");
    }
     return jwt.verify(token, secret)
}
let blacklist = new Set();
exports.logout = (token) => {
    blacklist.add(token);
    return "User Logout successfully";
};