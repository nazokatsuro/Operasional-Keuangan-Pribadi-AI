import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase with generated applet configuration
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
// Google Drive scope as requested
provider.addScope('https://www.googleapis.com/auth/drive');

// In-memory access token cache (do not store in localStorage or sessionStorage for security)
let cachedAccessToken: string | null = null;

export interface DraftPayload {
  transactions: any[];
  accounts: any[];
  assets: any[];
  debts: any[];
  userProfile: any;
  categoryBudgets?: Record<string, number>;
  emergencyConfig?: any;
}

/**
 * Trigger pop-up login using Google OAuth provider configured with Google Drive scope.
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Accessor for the active/cached in-memory Google access token.
 */
export const getGDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sets or overrides the cached access token (useful for re-initializing cached session if needed).
 */
export const setGDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Explicitly logs out from Google Drive / Cloud Storage session.
 */
export const logoutGDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Searches for 'pembukuan_pribadi_(email).json' inside Google Drive.
 * Returns the file ID if it exists and is not trashed, otherwise null.
 */
export const searchDraftFile = async (accessToken: string): Promise<string | null> => {
  try {
    const email = auth.currentUser?.email || 'pribadi';
    const fileName = `pembukuan_pribadi_${email}.json`;
    const q = encodeURIComponent(`name = '${fileName}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Gagal mencari draf di Google Drive: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error searching draft file:', error);
    return null;
  }
};

/**
 * Downloads and parses 'pembukuan_pribadi_(email).json' content from Google Drive by file ID.
 */
export const downloadDraftFile = async (accessToken: string, fileId: string): Promise<DraftPayload | null> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Gagal mengunduh berkas draf: ${response.statusText}`);
    }

    const payload = await response.json();
    return payload;
  } catch (error) {
    console.error('Error downloading draft from Drive:', error);
    return null;
  }
};

/**
 * Saves (creates or updates) 'pembukuan_pribadi_(email).json' draft to Google Drive.
 */
export const saveDraftFile = async (accessToken: string, payload: DraftPayload): Promise<boolean> => {
  try {
    const fileId = await searchDraftFile(accessToken);
    const email = auth.currentUser?.email || 'pribadi';
    const fileName = `pembukuan_pribadi_${email}.json`;

    if (fileId) {
      // 1. Update existing file content (PATCH uploadType=media)
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const response = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gagal meng-update draf ke Google Drive: ${response.statusText}`);
      }

      return true;
    } else {
      // 2. Create new file with metadata (POST)
      const createUrl = 'https://www.googleapis.com/drive/v3/files';
      const metadataResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          mimeType: 'application/json'
        })
      });

      if (!metadataResponse.ok) {
        throw new Error(`Gagal membuat metadata berkas draf: ${metadataResponse.statusText}`);
      }

      const fileMetadata = await metadataResponse.json();
      const newFileId = fileMetadata.id;

      // 3. Upload content with PATCH media
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!uploadResponse.ok) {
        throw new Error(`Gagal mengupload konten draf baru: ${uploadResponse.statusText}`);
      }

      return true;
    }
  } catch (error) {
    console.error('Error saving draft draft to Drive:', error);
    return false;
  }
};
