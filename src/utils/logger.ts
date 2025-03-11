/**
 * Logger Utility
 * 
 * This file provides a centralized logging system for the application.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger class for centralized logging
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logFilePath: string;
  private logToConsole: boolean = true;
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Set log file path with current date
    this.logFilePath = path.join(logsDir, `rag-chatbot-${new Date().toISOString().split('T')[0]}.log`);
    
    // Set log level from environment variable if available
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && LogLevel[envLogLevel as keyof typeof LogLevel] !== undefined) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Set the log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  /**
   * Enable or disable console logging
   */
  public setConsoleLogging(enabled: boolean): void {
    this.logToConsole = enabled;
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) return;
    
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    let logMessage = `[${timestamp}] [${levelStr}] ${message}`;
    
    if (data) {
      if (data instanceof Error) {
        logMessage += `\n${data.stack || data.message}`;
      } else {
        try {
          logMessage += `\n${JSON.stringify(data, null, 2)}`;
        } catch (e) {
          logMessage += `\n[Non-serializable data: ${typeof data}]`;
        }
      }
    }
    
    // Log to console if enabled
    if (this.logToConsole) {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           level === LogLevel.DEBUG ? console.debug :
                           console.log;
      consoleMethod(logMessage);
    }
    
    // Log to file
    try {
      fs.appendFileSync(this.logFilePath, logMessage + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log an info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   */
  public error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }
}

/**
 * Export a singleton instance of the logger
 */
export const logger = Logger.getInstance(); 