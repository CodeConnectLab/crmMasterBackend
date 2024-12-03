

const LocalData={
    "ENG": {
      "appName": "Yoga",
      "onBoarding": {
        "Skip": "Skip",
        "title1": "Yoga is the journey of the self, through the self, to the self.",
        "title2": "The body is your temple. Keep it pure and clean for the soul to reside in.",
        "title3": "Yoga is not about touching your toes, it's about what you learn on the way down."
      }
    },
    "HIN": {
      "appName": "Yoga",
      "onBoarding": {
        "Skip": "Skip",
        "title1": "Yoga is the journey of the self, through the self, to the self.",
        "title2": "The body is your temple. Keep it pure and clean for the soul to reside in.",
        "title3": "Yoga is not about touching your toes, it's about what you learn on the way down."
      }
    },
    "language":"ENG"
  };
  

exports.getstaticsDataForApp = async () => {
    return {LocalData:LocalData};
}