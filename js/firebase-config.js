// Firebase settings for MileageMate. These values are public, not secrets.
// Data is protected by Firebase Authentication and the rules in firestore.rules.
// Never put a service-account key, private key or AI provider key here.

export const firebaseConfig = {
  apiKey: 'AIzaSyDp5BPMZPXqFDS5pHfOddmiNMBZf1p_y0U',
  authDomain: 'mileagemate-1311.firebaseapp.com',
  projectId: 'mileagemate-1311',
  appId: '1:329782184626:web:74ef5970ff1f5c9e2ed7ab',
};

export const authOptions = {
  google: true,
  phone: false, // SMS sign-in needs the Firebase Blaze plan; see README.md
  phoneCountryCode: '+91',
};

// For local testing with the Firebase emulators only. Leave as null.
export const emulators = null;
