# RAG Chatbot Maintenance Scripts

This directory contains scripts for maintaining the RAG chatbot system, particularly for fixing issues with the file catalog and file processing.

## Available Scripts

### `fix-file-errors.js`

This script identifies files with processing errors, resets their processing status, and removes temporary files.

```bash
# Basic usage
node scripts/fix-file-errors.js

# Force processing of all files
node scripts/fix-file-errors.js --force
```

### `fix-metadata-issues.js`

This script specifically targets metadata issues in the file catalog:
- Reduces metadata size for files exceeding the limit
- Removes temporary files from the catalog
- Cleans up references to missing files
- Fixes content extraction issues

```bash
node scripts/fix-metadata-issues.js
```

### `clean-missing-files.js`

This script cleans up missing files from the file catalog:
- Identifies files that no longer exist in the knowledgebase
- Removes them from the catalog or marks them as errors

```bash
# Only remove temporary missing files
node scripts/clean-missing-files.js

# Remove all missing files
node scripts/clean-missing-files.js --remove-all

# Debug mode
node scripts/clean-missing-files.js --debug
```

### `clean-error-files.js`

This script cleans up files with errors from the file catalog:
- Identifies files with error status
- Removes them from the catalog or resets their status

```bash
# Remove non-existent files with errors
node scripts/clean-error-files.js

# Remove all files with errors
node scripts/clean-error-files.js --remove-all

# Reset processing status for files with errors
node scripts/clean-error-files.js --reset-status
```

### `inspect-catalog.js`

This script inspects the file catalog structure and checks for any issues:
- Shows catalog structure
- Lists sample files
- Counts files by processing status
- Lists files with errors
- Lists missing files

```bash
node scripts/inspect-catalog.js
```

### `maintain-catalog.js`

This script performs comprehensive maintenance on the file catalog, combining multiple maintenance tasks into a single operation. It now uses the improved selective processing approach for better performance.

#### Features

- **Removes temporary files** from the catalog
- **Cleans up missing files** from the catalog
- **Resets processing status** for files with errors
- **Updates the knowledge base** using selective processing

#### Usage

```bash
node scripts/maintain-catalog.js [options]
```

#### Options

- `--remove-all`: Remove all missing files (not just temporary ones)
- `--clean-errors`: Reset all files with errors to pending status
- `--skip-update`: Skip the knowledge base update step
- `--verbose`: Show more detailed output

#### Example

```bash
# Run comprehensive maintenance with all options
node scripts/maintain-catalog.js --remove-all --clean-errors --verbose

# Run maintenance but skip the knowledge base update
node scripts/maintain-catalog.js --skip-update
```

### `schedule-error-fix.js`

This script sets up a file watcher to automatically run the error fix script when files change in the knowledgebase directory.

```bash
node scripts/schedule-error-fix.js
```

## Optimized Knowledge Base Update

### `selective-update.js`

This script demonstrates the improved knowledge base update process with selective processing of only changed files. It provides significant performance improvements over the standard update process by:

1. **Selective Processing**: Only processes files that have been added, changed, or marked as errored.
2. **Differential Updates**: Implements chunk-level hashing to update only modified sections of files.
3. **Intelligent Cache Management**: Only refreshes the Redis cache when changes are detected.
4. **Detailed Statistics**: Provides comprehensive statistics about the update process.

#### Usage

```bash
node scripts/selective-update.js
```

#### Benefits

- **Faster Updates**: By only processing changed files and chunks, updates are significantly faster.
- **Reduced Resource Usage**: Less CPU and memory usage during updates.
- **Better Reliability**: More robust error handling and recovery.
- **Improved Monitoring**: Detailed statistics for monitoring the update process.

#### Example Output

```
=== Knowledge Base Update Summary ===
Status: Success
Message: Knowledge base updated successfully

Statistics:
- Total files in catalog: 489
- Files processed: 5
- Files skipped (unchanged): 484
- Files deleted: 0
- Chunks added: 12
- Chunks removed: 8
- Chunks unchanged: 120

Total time: 8.45 seconds
```

## Common Issues and Solutions

### Temporary Files

Temporary files (starting with `~$`) created by Microsoft Office applications can cause issues with the RAG chatbot. The maintenance scripts automatically remove these files from both the filesystem and the catalog.

### Metadata Size Issues

Some files may have metadata that exceeds the size limit (48KB). The `fix-metadata-issues.js` script reduces the metadata size by:
- Truncating descriptions
- Limiting keywords and content tags
- Removing version history
- Reducing chunk count for very large files

### Content Extraction Issues

Some files may fail during content extraction. The maintenance scripts reset their processing status so they can be processed again.

### Missing Files

Files that are referenced in the catalog but don't exist in the knowledgebase can cause confusion. The maintenance scripts either remove these files from the catalog or mark them as errors.

## Integration with Cron Jobs

For automated maintenance, you can set up cron jobs to run these scripts periodically:

### Example Cron Jobs

#### Daily Maintenance

Run the comprehensive maintenance script once a day:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2 AM
0 2 * * * cd /path/to/rag-chatbot-with-vercel-ai-sdk && node scripts/maintain-catalog.js
```

#### Hourly Error Check

Check for and fix errors every hour:

```bash
# Add this line to run hourly
0 * * * * cd /path/to/rag-chatbot-with-vercel-ai-sdk && node scripts/fix-file-errors.js
```

#### Weekly Deep Clean

Perform a deep clean once a week to remove all problematic files:

```bash
# Add this line to run weekly on Sunday at 3 AM
0 3 * * 0 cd /path/to/rag-chatbot-with-vercel-ai-sdk && node scripts/maintain-catalog.js --remove-all --clean-errors
```

### Setting Up Cron Jobs on macOS

1. Open Terminal
2. Edit your crontab: `crontab -e`
3. Add the desired cron job(s)
4. Save and exit

### Setting Up Cron Jobs on Linux

1. Open Terminal
2. Edit your crontab: `crontab -e`
3. Add the desired cron job(s)
4. Save and exit

### Setting Up Scheduled Tasks on Windows

1. Open Task Scheduler
2. Create a new Basic Task
3. Set the trigger (daily, weekly, etc.)
4. Set the action to "Start a program"
5. Enter the path to Node.js and the script as arguments
6. Complete the wizard

## Monitoring

To monitor the health of your RAG chatbot system, you can:

### 1. Check the File Catalog Status

Use the `inspect-catalog.js` script to get a quick overview of the file catalog status:

```bash
node scripts/inspect-catalog.js
```

This will show you:
- Total number of files in the catalog
- Number of files with errors
- Number of files in each processing status
- Sample files with errors

### 2. Set Up Logging

Modify the cron jobs to log the output of the maintenance scripts:

```bash
# Example with logging
0 2 * * * cd /path/to/rag-chatbot-with-vercel-ai-sdk && node scripts/maintain-catalog.js >> /path/to/logs/maintenance.log 2>&1
```

### 3. Create a Dashboard

You can create a simple dashboard by adding a new script that generates an HTML report:

```javascript
// Example dashboard script (scripts/generate-dashboard.js)
const fs = require('fs');
const path = require('path');

// Load the file catalog
const catalogPath = path.join(process.cwd(), 'file-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Count files by status
const statusCounts = {};
for (const fileId in catalog.files) {
  const status = catalog.files[fileId].processingStatus || 'unknown';
  statusCounts[status] = (statusCounts[status] || 0) + 1;
}

// Generate HTML
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>RAG Chatbot Status</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 15px; }
    .success { color: green; }
    .error { color: red; }
    .pending { color: orange; }
  </style>
</head>
<body>
  <h1>RAG Chatbot Status</h1>
  <div class="card">
    <h2>File Catalog</h2>
    <p>Total Files: ${Object.keys(catalog.files).length}</p>
    <p>Last Updated: ${catalog.lastUpdated}</p>
  </div>
  <div class="card">
    <h2>Processing Status</h2>
    <p class="success">Success: ${statusCounts.success || 0}</p>
    <p class="error">Error: ${statusCounts.error || 0}</p>
    <p class="pending">Pending: ${statusCounts.pending || 0}</p>
  </div>
</body>
</html>
`;

// Write to file
fs.writeFileSync(path.join(process.cwd(), 'dashboard.html'), html);
console.log('Dashboard generated: dashboard.html');
```

Run this script to generate a simple HTML dashboard:

```bash
node scripts/generate-dashboard.js
```

### 4. Set Up Email Alerts

You can modify the maintenance scripts to send email alerts when issues are detected:

```javascript
// Example email alert function
function sendEmailAlert(subject, message) {
  const nodemailer = require('nodemailer');
  
  // Configure email transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-password'
    }
  });
  
  // Email options
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: 'admin@example.com',
    subject: subject,
    text: message
  };
  
  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

// Example usage
if (errorCount > 10) {
  sendEmailAlert(
    'RAG Chatbot Alert: High Error Count',
    `There are ${errorCount} files with errors in the catalog. Please check the system.`
  );
}
```

Note: To use email alerts, you'll need to install the nodemailer package:

```bash
npm install nodemailer
```

## Troubleshooting

If you encounter issues:

1. Make sure the scripts are executable:
   ```bash
   chmod +x scripts/fix-file-errors.js
   chmod +x scripts/schedule-error-fix.js
   ```

2. Check that the file paths in the scripts match your project structure

3. For the scheduler, ensure chokidar is installed:
   ```bash
   npm install chokidar
   ```

4. If the scripts aren't detecting errors, run with the `--force` flag to check if there are any issues with the detection logic 