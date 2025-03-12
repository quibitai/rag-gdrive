// Script to fix the build error in knowledgebase-embeddings.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'actions', 'knowledgebase-embeddings.ts');

try {
  console.log(`Reading file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if the file contains the error
  if (content.includes('isInFolderHierarchy = await checkParents(currentParents);')) {
    console.log('Found the error, fixing...');
    
    // Replace the problematic code
    const fixedContent = content.replace(
      /isInFolderHierarchy = await checkParents\(currentParents\);/g,
      'isInFolderHierarchy = checkParents(currentParents);'
    );
    
    // Also fix any async function declarations
    const finalContent = fixedContent.replace(
      /const checkParents = async \(parentIds/g,
      'const checkParents = (parentIds'
    );
    
    // Write the fixed content back to the file
    fs.writeFileSync(filePath, finalContent);
    console.log('Fixed the build error!');
  } else {
    console.log('Error pattern not found. Searching for similar patterns...');
    
    // Look for similar patterns
    if (content.includes('await checkParents')) {
      console.log('Found similar pattern with "await checkParents"');
      
      // Replace all instances of await checkParents
      const fixedContent = content.replace(
        /await checkParents/g,
        'checkParents'
      );
      
      // Write the fixed content back to the file
      fs.writeFileSync(filePath, fixedContent);
      console.log('Fixed potential build error!');
    } else {
      console.log('No similar patterns found. Searching for any await in filter...');
      
      // Look for any await in a filter function
      const filterAwaitRegex = /\.filter\([^)]*await[^)]*\)/g;
      if (filterAwaitRegex.test(content)) {
        console.log('Found await in a filter function');
        
        // Replace all instances of await in filter functions
        const fixedContent = content.replace(
          filterAwaitRegex,
          (match) => match.replace(/await /g, '')
        );
        
        // Write the fixed content back to the file
        fs.writeFileSync(filePath, fixedContent);
        console.log('Fixed potential build error in filter function!');
      } else {
        console.log('No await in filter functions found.');
        
        // Last resort: print the lines around line 265-270
        const lines = content.split('\n');
        console.log('Lines 260-275:');
        for (let i = 259; i < 275 && i < lines.length; i++) {
          console.log(`${i+1}: ${lines[i]}`);
        }
      }
    }
  }
} catch (error) {
  console.error('Error:', error);
} 