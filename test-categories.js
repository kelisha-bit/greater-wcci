// Test file to verify donation categories are properly exported
const { donationCategoryOptions, donationCategoryColors } = require('./src/constants/options.ts');
const { donationCategoryColors: colors } = require('./src/constants/colors.ts');

console.log('Donation Category Options:');
console.log(donationCategoryOptions);

console.log('\nDonation Category Colors:');
console.log(colors);

console.log('\nChecking for new categories:');
console.log('Wednesday Service:', donationCategoryOptions.includes('Wednesday Service'));
console.log('Conference:', donationCategoryOptions.includes('Conference'));
