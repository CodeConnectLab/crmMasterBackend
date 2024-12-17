// const LeadModel = require('../lead/lead.model') // Adjust the path as needed
// const LeadSourceModel = require('../leadSources/leadSources.model')
// const CompanyModel = require('../company/company.model')
// const crypto = require('crypto')

// const ENCRYPTION_KEY =
//   process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here' // 32 bytes
// const IV_LENGTH = 16 // For AES, this is always 16

// const encrypt = (text) => {
//   const iv = crypto.randomBytes(IV_LENGTH)
//   const cipher = crypto.createCipheriv(
//     'aes-256-cbc',
//     Buffer.from(ENCRYPTION_KEY),
//     iv
//   )
//   let encrypted = cipher.update(`${text}`)
//   encrypted = Buffer.concat([encrypted, cipher.final()])
//   return iv.toString('hex') + ':' + encrypted.toString('hex')
// }

// const decrypt = (text) => {
//   const textParts = text.split(':')
//   const iv = Buffer.from(textParts.shift(), 'hex')
//   const encryptedText = Buffer.from(textParts.join(':'), 'hex')
//   const decipher = crypto.createDecipheriv(
//     'aes-256-cbc',
//     Buffer.from(ENCRYPTION_KEY),
//     iv
//   )
//   let decrypted = decipher.update(encryptedText)
//   decrypted = Buffer.concat([decrypted, decipher.final()])
//   return decrypted.toString()
// }

// const generateApiKey = (leadSource, companyId) => {
//   const data = `${leadSource}_${companyId}`
//   return encrypt(data)
// }

// exports.getCurlApi = async (leadSource, user) => {
//   console.log(leadSource, user?.companyId)
//   try {
//     if (!leadSource || !user?.companyId) {
//       throw new Error('LeadSource and companyId are required')
//     }

//     const apiKey = generateApiKey(leadSource, user.companyId)
//     const baseUrl = process.env.BASE_URL || 'https://api.codeconnect.in'

//     const curlCommand = `curl -X POST "${baseUrl}/api/v1/outsource-lead?apikey=${apiKey}" \\
//       -H "Content-Type: application/json" \\
//       -d '{"propertyDetails": "YOUR_PROPERTY_DATA_HERE"}'`

//     return {
//       apiKey,
//       curlCommand,
//       leadSource,
//       companyId: user.companyId
//     }
//   } catch (error) {
//     return Promise.reject(error)
//   }
// }

const crypto = require('crypto')
const LeadModel = require('../lead/lead.model')
const LeadSourceModel = require('../leadSources/leadSources.model')
const CompanyModel = require('../company/company.model')

// Key derivation function to ensure proper key length
const deriveKey = (key) => {
  return crypto.scryptSync(key, 'salt', 32) // Returns a 32-byte key
}

// Use a proper encryption key (32 bytes)
const ENCRYPTION_KEY = deriveKey(
  process.env.ENCRYPTION_KEY || 'your-secret-key-here'
)
const IV_LENGTH = 16

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Encryption failed')
  }
}

const decrypt = (text) => {
  try {
    const [ivHex, encryptedHex] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Invalid API key format')
  }
}

const generateApiKey = (leadSource, companyId) => {
  const data = `${leadSource}_${companyId}`
  return encrypt(data)
}

exports.getCurlApi = async (leadSource, user) => {
  try {
    if (!leadSource || !user?.companyId) {
      throw new Error('LeadSource and companyId are required')
    }

    // Verify leadSource and companyId exist in database
    const [leadSourceDoc, companyDoc] = await Promise.all([
      LeadSourceModel.findById(leadSource),
      CompanyModel.findById(user.companyId)
    ])

    if (!leadSourceDoc || !companyDoc) {
      throw new Error('Invalid LeadSource or Company ID')
    }

    const apiKey = generateApiKey(leadSource, user.companyId)
    const baseUrl = process.env.BASE_URL || 'https://api.codeconnect.in/api/v1'

    const curlCommand = `curl --location '${baseUrl}/outsource-lead?apikey=${apiKey}' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: {{token}}' \
--data-raw '{
    "firstName": "Arun",
    "lastName": "Kumar",
    "email": "jane.smith@example.com",
    "contactNumber": "9667432436",
    "description":"this lead come from ",
    "fullAddress":"Delhi ,India",
    "city": "Bangalore"
}'`

    return {
      //   apiKey,
      curlCommand
      //   leadSource,
      //   companyId: user.companyId
    }
  } catch (error) {
    console.error('Error in getCurlApi:', error)
    return Promise.reject(error)
  }
}

exports.OutsourceLead = async (apiKey, body) => {
  try {
    if (!apiKey) {
      throw new Error('API key is required')
    }
    let decryptedData
    try {
      decryptedData = decrypt(apiKey)
    } catch (error) {
      throw new Error('Invalid API key format')
    }
    const [leadSource, companyId] = decryptedData.split('_')
    if (!leadSource || !companyId) {
      throw new Error('Invalid API key')
    }
    // Verify against database
    const LeadSource = await LeadSourceModel.findById(leadSource)
    const Company = await CompanyModel.findById(companyId)
    if (!LeadSource || !Company) {
      throw new Error('Invalid API key - Invalid LeadSource or Company')
    }
    // Create lead data object
    const leadData = {
      ...body,
      leadAddType: 'ThirdParty',
      leadSource: leadSource,
      companyId: companyId,
      followUpDate: new Date(),
      createdAt: new Date()
    }
    // Save to Lead table
    const newLead = new LeadModel(leadData)
    const savedLead = await newLead.save()
    if (!savedLead) {
      throw new Error('Failed to save lead')
    }
    // Return the saved lead data
    return {
      lead: savedLead
    }
  } catch (error) {
    console.error('Error in OutsourceLead:', error)
    return Promise.reject(error)
  }
}

// Optional: Add a utility function to decode API key (for debugging)
exports.decodeApiKey = (apiKey) => {
  try {
    const decryptedData = decrypt(apiKey)
    const [leadSource, companyId] = decryptedData.split('_')
    return { leadSource, companyId }
  } catch (error) {
    throw new Error('Invalid API key')
  }
}
