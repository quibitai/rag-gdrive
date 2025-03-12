#!/usr/bin/env node

/**
 * Selective Knowledge Base Update Script
 * 
 * This script demonstrates the improved knowledge base update process
 * with selective processing of only changed files.
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Configuration
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'default-secret-key';
const API_HOST = 'localhost';
const API_PORT = 3000;
const API_PATH = '/api/scheduled-update';

async function main() {
  console.log('Starting selective knowledge base update...');
  
  try {
    // Check if the development server is running
    const isServerRunning = checkServerRunning();
    
    if (!isServerRunning) {
      console.log('Development server is not running. Starting server...');
      startDevServer();
      
      // Wait for the server to start
      console.log('Waiting for server to start...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Start timer
    const startTime = Date.now();
    
    // Call the API to update the knowledge base
    console.log('Calling API to update knowledge base...');
    const result = await callUpdateAPI();
    
    // Calculate elapsed time
    const elapsedTime = (Date.now() - startTime) / 1000;
    
    console.log('\n=== Knowledge Base Update Summary ===');
    console.log(`Status: ${result.success ? 'Success' : 'Failed'}`);
    console.log(`Message: ${result.message}`);
    
    if (result.stats) {
      console.log('\nStatistics:');
      console.log(`- Total files in catalog: ${result.stats.totalFiles}`);
      console.log(`- Files processed: ${result.stats.processedFiles}`);
      console.log(`- Files skipped (unchanged): ${result.stats.skippedFiles}`);
      console.log(`- Files deleted: ${result.stats.deletedFiles}`);
      
      if (result.stats.addedChunks !== undefined) {
        console.log(`- Chunks added: ${result.stats.addedChunks}`);
        console.log(`- Chunks removed: ${result.stats.removedChunks}`);
        console.log(`- Chunks unchanged: ${result.stats.unchangedChunks}`);
      }
    }
    
    console.log(`\nTotal time: ${elapsedTime.toFixed(2)} seconds`);
    console.log('\nKnowledge base update completed successfully!');
    
    // Provide instructions for testing the updated knowledge base
    console.log('\nTo test the updated knowledge base:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open your browser to http://localhost:3000');
    console.log('3. Ask questions about your knowledge base content');
    
  } catch (error) {
    console.error('Error updating knowledge base:', error);
    process.exit(1);
  }
}

// Check if the development server is running
function checkServerRunning() {
  try {
    // Try to connect to the server
    const options = {
      host: API_HOST,
      port: API_PORT,
      path: '/',
      method: 'HEAD',
      timeout: 2000
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        resolve(res.statusCode < 400);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

// Start the development server
function startDevServer() {
  try {
    // Start the server in the background
    const child = require('child_process').spawn('npm', ['run', 'dev'], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Unref the child process so it can run independently
    child.unref();
    
    console.log('Development server started in the background');
    return true;
  } catch (error) {
    console.error('Error starting development server:', error);
    return false;
  }
}

// Call the API to update the knowledge base
function callUpdateAPI() {
  return new Promise((resolve, reject) => {
    // Prepare the request data
    const data = JSON.stringify({
      secretKey: API_SECRET_KEY
    });
    
    // Prepare the request options
    const options = {
      host: API_HOST,
      port: API_PORT,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    // Make the request
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });
    
    // Send the request
    req.write(data);
    req.end();
  });
}

main().catch(console.error); 