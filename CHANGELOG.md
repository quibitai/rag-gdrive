# Changelog

All notable changes to the RAG Chatbot with Vercel AI SDK project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-03-14

### Added
- New `fix-file-paths.js` script (v2.1) to fix file paths in the catalog
- Support for categorizing documents into appropriate folders
- Improved folder structure for financial documents and client files
- Detailed statistics for file path updates

### Fixed
- Issue with files from nested folders appearing in the root directory
- Proper folder structure for Admin/Financials and its subfolders
- Enhanced error handling in file catalog operations

### Changed
- Updated README.md with information about the new script
- Improved backup mechanism with timestamped backups

## [2.1.0] - 2025-03-13

### Added
- WebSocket server for real-time file catalog updates
- Dashboard for monitoring file processing status
- Support for multiple file types (PDF, DOCX, TXT, MD)
- Dark mode support
- Responsive design for mobile and desktop

### Fixed
- File processing error handling
- Vector store initialization issues
- Chat streaming reliability

### Changed
- Upgraded to Next.js 14
- Improved RAG implementation with better context retrieval
- Enhanced UI for chat interface

## [2.0.0] - 2025-03-01

### Added
- Initial release of RAG Chatbot with Vercel AI SDK
- Google Drive integration for document syncing
- Vector search using Upstash Vector
- Chat interface with streaming responses
- File catalog for tracking document processing
- Support for scheduled updates

### Changed
- Migrated from prototype to production-ready application
- Implemented selective document processing
- Added support for chunk-level differential updates 