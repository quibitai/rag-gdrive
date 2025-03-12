# Deprecated Scripts

This directory contains scripts that were used during development but are no longer actively maintained or have been replaced by more comprehensive solutions in the main `scripts` directory.

## Files in this Directory

### `fix-file-catalog.js`

This script was used to fix issues with the file catalog, including:
- Adding missing files to the catalog
- Fixing build errors in the knowledgebase-embeddings.ts file

It has been replaced by more specialized scripts:
- `scripts/fix-metadata-issues.js` - For fixing metadata issues
- `scripts/clean-missing-files.js` - For cleaning up missing files
- `scripts/maintain-catalog.js` - For comprehensive catalog maintenance

### `fix-build-error.js`

This script was specifically designed to fix a build error in the knowledgebase-embeddings.ts file related to async functions in filter callbacks. The fix has been incorporated into the main codebase, making this script redundant.

### `add-test-file.js`

A simple utility script used during development to add a test file to the catalog for debugging purposes. This functionality is now available through the more comprehensive maintenance scripts.

### `test-drive-access.js`

This script was used to test Google Drive API access with the service account. It verifies that:
- The service account credentials are valid
- The service account has access to the specified Google Drive folder
- Files in the folder are visible to the service account

This script can still be useful for troubleshooting Google Drive integration issues but is not part of the regular maintenance workflow.

## Usage

These scripts are kept for reference purposes and may be useful in specific debugging scenarios. However, it's recommended to use the actively maintained scripts in the parent directory for regular maintenance tasks.

If you need to use one of these scripts for a specific purpose:

```bash
node scripts/deprecated/script-name.js
```

## Note

These scripts may not be compatible with the latest version of the codebase and may require modifications to work properly. 