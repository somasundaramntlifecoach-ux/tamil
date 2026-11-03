# STUDENT SUCCESS 360° — Firebase Login Connection Starter

## Included
- `index.html`: mobile-friendly English/Tamil login and account creation interface
- `app.js`: Firebase Authentication using browser ES modules
- `firebase-config.js`: configured with your supplied Firebase public web-app configuration
- `firestore.rules`: deny-all starter rules for student data safety

## Publish with GitHub Pages
1. Open GitHub and create a repository (e.g. `student-success-360`).
2. Upload `index.html`, `app.js`, and `firebase-config.js` into the repository root. Do not upload any student data.
3. Repository Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save.
4. Wait for the Pages site link and open it in Chrome.
5. Firebase Console → Authentication → Settings → Authorized domains → add your GitHub Pages **hostname**, e.g. `yourname.github.io` (without `https://` or repository path).
6. Firebase Console → Authentication → Sign-in method → ensure Email/Password is enabled.
7. Create a TEST account and check Firebase Authentication → Users. Verify the email and test login, logout, and password reset.

## Firestore
The starter does not write to Firestore. Keep Firestore locked. You can paste `firestore.rules` into Firestore → Rules and Publish to explicitly deny all client access while building the guardian-consent workflow.

## Important safeguards
- Account signup is not proof of parent consent.
- Email verification is not proof of parent consent.
- No coach/admin role is assigned by client-side code.
- Do not use open Firestore rules, store student data in GitHub, or put Firebase Admin SDK/service account keys in browser files.
- This starter is for connecting Firebase login, not the complete Student Success 360 assessment/coaching portal.
