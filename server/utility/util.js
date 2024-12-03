const crypto = require("crypto")

exports.getHashedPassword = (password, salt) => {
    return crypto.createHash("sha512").update(password + salt).digest("hex");
}

exports.generateSalt = () => {
    return crypto.randomBytes(16).toString("base64");
}

exports.generateCompanyCode = () => {
    const timestamp = Date.now().toString();
    return `COM${timestamp.slice(-6)}`;
  };

exports.generatePassword = () => {
    var length = 6,
        charset = "ab78cdef05ghi34jklmnopqr12stuvwxyz69",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

exports.generateOTP = (len = 6) => {
    var length = len,
        charset = "1234567890",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}