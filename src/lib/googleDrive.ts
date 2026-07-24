import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('gdrive_token');

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('gdrive_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم الحصول على رمز الوصول من جوجل');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('gdrive_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

import { initDB } from '../db';

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('gdrive_token');
};

/**
 * Performs silent automatic background sync to Google Drive
 */
export const performAutoDriveBackup = async (): Promise<boolean> => {
  try {
    if (!cachedAccessToken) return false;
    const db = await initDB();
    const customers = await db.getAll('customers');
    const accounts = await db.getAll('accounts');
    const orders = await db.getAll('orders');
    const history = await db.getAll('history');

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      app: 'Pixel Tailor',
      autoSync: true,
      data: { customers, accounts, orders, history }
    };

    await backupToGoogleDrive(backupData);
    console.log('✓ Automatic Google Drive sync completed.');
    return true;
  } catch (err) {
    console.warn('Auto Drive backup notice:', err);
    return false;
  }
};

/**
 * Uploads or updates a backup JSON file on Google Drive
 */
export const backupToGoogleDrive = async (backupData: any): Promise<{ id: string; name: string }> => {
  if (!cachedAccessToken) {
    throw new Error('يرجى تسجيل الدخول بحساب جوجل أولاً');
  }

  const fileName = 'pixel_tailor_backup.json';
  const fileContent = JSON.stringify(backupData, null, 2);

  // 1. Check if the file already exists in Google Drive
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id, name, modifiedTime)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json();
    throw new Error(err.error?.message || 'فشل البحث في Google Drive');
  }

  const searchData = await searchRes.json();
  const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'النسخة الاحتياطية لتطبيق الخياطة - Pixel Tailoring'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  if (existingFile) {
    // Update existing file
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
      body: form,
    });

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.error?.message || 'فشل تحديث ملف النسخة الاحتياطية على Drive');
    }

    const updated = await updateRes.json();
    return { id: updated.id, name: updated.name || fileName };
  } else {
    // Create new file
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
      body: form,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.error?.message || 'فشل رفع النسخة الاحتياطية إلى Drive');
    }

    const created = await uploadRes.json();
    return { id: created.id, name: created.name || fileName };
  }
};

/**
 * Downloads the backup file from Google Drive
 */
export const restoreFromGoogleDrive = async (): Promise<any> => {
  if (!cachedAccessToken) {
    throw new Error('يرجى تسجيل الدخول بحساب جوجل أولاً');
  }

  const fileName = 'pixel_tailor_backup.json';

  // 1. Find the backup file
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id, name, modifiedTime)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });

  if (!searchRes.ok) {
    throw new Error('فشل البحث عن ملف النسخة الاحتياطية في Google Drive');
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    throw new Error('لم يتم العثور على أي نسخة احتياطية سابقة في حسابك على Google Drive');
  }

  const fileId = searchData.files[0].id;

  // 2. Download file content
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const downloadRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });

  if (!downloadRes.ok) {
    throw new Error('فشل تنزيل ملف النسخة الاحتياطية من Google Drive');
  }

  const backupData = await downloadRes.json();
  return backupData;
};
