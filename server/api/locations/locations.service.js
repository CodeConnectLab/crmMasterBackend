const { Country, State, City, ICountry, IState, ICity } = require('country-state-city');

const productServiceModel = require('../productService/productService.model');
const leadStatusModel = require('../leadStatus/leadStatus.model');
const leadSourceModel = require('../leadSources/leadSources.model');
const userModel = require('../user/user.model');


exports.getAllCountry = async ({ }, user) => {
    try {
        const countries = Country.getAllCountries();
        const data = countries.map(country => ({
            name: country.name,
            _id: country.isoCode,
        }))
        return data;
    } catch (error) {
        return Promise.reject(error);
    }
};

exports.getAllState = async (countryCode, user) => {
    try {
        const States = State.getStatesOfCountry(countryCode);
        const data = States.map(country => ({
            name: country.name,
            _id: country.isoCode,
        }))
        return data;
    } catch (error) {
        return Promise.reject(error);
    }
};

exports.getAllTypes = async ({},user) => {
    try {
      // Input validation
      if (!user?.companyId || !user?._id) {
        throw new Error('Invalid user data');
      }
      // Fetch all lead statuses for the company
      const statuses = await leadStatusModel.find({
        companyId: user.companyId,
        isActive: true,
        deleted: false
      }).select('name').lean();
  
      // Fetch all lead sources for the company
      const sources = await leadSourceModel.find({
        companyId: user.companyId,
        isActive: true,
        deleted: false
      }).select('name').lean();
  
      // Fetch users based on role
      const agents = await userModel.find({
        companyId: user.companyId,
        ...(user.role !== 'Super Admin' && { _id: user._id }),
        deleted: false
      }).select('name role').lean();
  
      // Fetch all products and services for the company
      const productsServices = await productServiceModel.find({
        companyId: user.companyId,
        isActive: true,
        deleted: false
      }).select('name').lean();

      // Get countries list
      const Countr = Country.getAllCountries();
      const countries = Countr.map(country => ({
        name: country.name,
        isoCode: country.isoCode,
      }));
  
      return {
        status: statuses,
        sources,
        agents,
        productsServices,
        countries
      };
  
    } catch (error) {
      return Promise.reject(error);
    }
  };



