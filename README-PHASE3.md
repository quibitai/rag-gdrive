# Phase 3: Active Embedding Updates

This phase implements selective updates for the RAG chatbot's knowledge base, making the system more efficient by only reprocessing files that have changed.

## Features Implemented

### 1. Selective File Processing

- **Content Hash Tracking**: Files are now tracked using SHA-256 content hashes to detect changes.
- **Change Detection**: The system identifies new, modified, and deleted files.
- **Efficient Updates**: Only files that have changed are reprocessed, saving time and resources.

### 2. File Catalog Management

- **Enhanced File Metadata**: The file catalog now tracks processing status, error messages, and chunk IDs.
- **File Change Detection**: The `checkForFileChanges` utility efficiently identifies which files need processing.
- **Deleted File Handling**: Chunks from deleted files are automatically removed from the vector database.

### 3. Scheduled Updates

- **API Endpoint**: A new `/api/scheduled-update` endpoint allows for automated updates via cron jobs or webhooks.
- **Authentication**: Updates are protected with a secret key to prevent unauthorized access.
- **Selective Processing**: The scheduled updates use the same selective processing logic as manual updates.

### 4. Dashboard UI

- **File Status Component**: A new UI component displays the status of all files in the knowledge base.
- **Manual Update Trigger**: Users can manually trigger updates from the dashboard.
- **Status Monitoring**: The dashboard shows processing status, file sizes, and error messages.

## How It Works

1. **File Change Detection**:
   - When an update is triggered, the system scans the knowledge base directory.
   - Each file's content is hashed and compared with the stored hash.
   - Files with different hashes or sizes are marked for reprocessing.

2. **Selective Processing**:
   - Only files that are new, modified, or previously failed are processed.
   - Unchanged files are skipped, significantly reducing processing time.

3. **Chunk Management**:
   - When a file is updated, its old chunks are removed from the vector database.
   - New chunks are generated and stored with updated metadata.
   - Deleted files have their chunks removed automatically.

4. **Status Tracking**:
   - Each file's processing status is tracked (pending, success, error).
   - Error messages are stored for troubleshooting.
   - The dashboard provides a real-time view of the knowledge base status.

## Usage

### Manual Updates

1. Navigate to the Dashboard at `/dashboard`.
2. View the status of all files in the knowledge base.
3. Click "Update Knowledge Base" to trigger a selective update.

### Scheduled Updates

Set up a cron job or webhook to call the scheduled update endpoint:

```bash
# Using curl with POST
curl -X POST https://your-domain.com/api/scheduled-update \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret-key"}'

# Using curl with GET (for testing)
curl "https://your-domain.com/api/scheduled-update?secret=your-secret-key"
```

Configure the secret key in your environment variables:

```
SCHEDULED_UPDATE_SECRET=your-secret-key
```

## Benefits

1. **Faster Updates**: Only processing changed files significantly reduces update time.
2. **Resource Efficiency**: Reduces CPU and memory usage during updates.
3. **Better Error Handling**: Failed files are tracked and can be retried.
4. **Improved Monitoring**: The dashboard provides visibility into the knowledge base status.
5. **Automation Ready**: Scheduled updates enable automated maintenance of the knowledge base.

## Next Steps

The next phase will focus on enhancing the retrieval capabilities with file-specific queries and metadata filtering.