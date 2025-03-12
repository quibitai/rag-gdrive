const { google } = require('googleapis');
const fs = require('fs');

// Path to your service account credentials
const SERVICE_ACCOUNT_FILE = 'service-credentials.json';
const TARGET_FOLDER_ID = '1ugjzN3AyIB0Zb-2JdFvoSRLvsExsmJHh';

async function testDriveAccess() {
  try {
    console.log('Testing Google Drive access with service account...');
    
    // Check if credentials file exists
    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      console.error(`ERROR: Service account file not found at ${SERVICE_ACCOUNT_FILE}`);
      return;
    }
    
    // Get service account email (for your reference)
    const credential = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
    console.log(`Service Account Email: ${credential.client_email}`);
    console.log('Make sure this email is shared on your Google Drive folder/files\n');
    
    // Initialize auth and Drive API
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    
    // Test 1: Check all visible files (no folder filter)
    console.log('Testing visibility of ALL files:');
    const allFilesResponse = await drive.files.list({
      pageSize: 100,
      fields: 'files(name, id, mimeType)',
    });
    
    const allFiles = allFilesResponse.data.files || [];
    console.log(`Found ${allFiles.length} total files visible to service account`);
    
    if (allFiles.length > 0) {
      console.log('Sample of visible files:');
      allFiles.slice(0, 5).forEach(file => {
        console.log(`- ${file.name} (${file.id})`);
      });
    } else {
      console.log('WARNING: Service account cannot see ANY files in Drive!');
    }
    
    // Test 2: Check specific folder files
    console.log(`\nTesting access to folder: ${TARGET_FOLDER_ID}`);
    const folderFilesResponse = await drive.files.list({
      q: `'${TARGET_FOLDER_ID}' in parents`,
      pageSize: 100,
      fields: 'files(name, id, mimeType)',
    });
    
    const folderFiles = folderFilesResponse.data.files || [];
    console.log(`Found ${folderFiles.length} files in target folder`);
    
    if (folderFiles.length > 0) {
      console.log('Files in folder:');
      folderFiles.forEach(file => {
        console.log(`- ${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found in the target folder');
    }
  } catch (error) {
    console.error('Error testing Drive access:', error);
  }
}

testDriveAccess(); 