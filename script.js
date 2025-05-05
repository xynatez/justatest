// script.js
(async () => {
  // First, import the Octokit library from CDN
  try {
    // Using skypack for modern module support
    const { Octokit } = await import('https://cdn.skypack.dev/@octokit/rest');
    window.Octokit = Octokit; // Make it available globally for easier debugging
  } catch (error) {
    console.error('Failed to load Octokit:', error);
    document.getElementById('status').textContent = '❌ Failed to load GitHub API client. Check console for details.';
    return;
  }

  // Get elements
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const statusEl = document.getElementById('status');
  
  // Function to validate inputs
  function validateInputs() {
    const authToken = document.getElementById('authToken').value;
    const owner = document.getElementById('owner').value;
    const repo = document.getElementById('repo').value;
    const path = document.getElementById('path').value;
    
    if (!authToken) {
      statusEl.textContent = '❌ Please enter a GitHub token';
      return null;
    }
    
    if (!owner) {
      statusEl.textContent = '❌ Please enter a repository owner';
      return null;
    }
    
    if (!repo) {
      statusEl.textContent = '❌ Please enter a repository name';
      return null;
    }
    
    if (!path) {
      statusEl.textContent = '❌ Please enter a file path';
      return null;
    }
    
    return { authToken, owner, repo, path };
  }
  
  // Function to create an Octokit instance
  function createOctokit(token) {
    return new window.Octokit({ 
      auth: token,
      userAgent: 'GitHub-Repository-Manager/1.0'
    });
  }
  
  // Save button event listener
  saveBtn.addEventListener('click', async () => {
    // Validate inputs
    const inputs = validateInputs();
    if (!inputs) return;
    
    const { authToken, owner, repo, path } = inputs;
    const newContent = document.getElementById('userInput').value;
    
    // Set status to loading
    statusEl.textContent = '⏳ Saving to GitHub...';
    statusEl.className = 'status loading';
    
    try {
      // Create Octokit instance
      const octokit = createOctokit(authToken);
      
      // First, try to get existing content
      let existingContent = '';
      let sha;
      try {
        const { data: existing } = await octokit.repos.getContent({ owner, repo, path });
        sha = existing.sha;
        
        // Decode existing content
        existingContent = decodeURIComponent(escape(atob(existing.content)));
        
        // If it's a JavaScript file with our format, extract the saved messages
        if (path.endsWith('.js')) {
          const match = existingContent.match(/window\.savedMessages\s*=\s*(\[[\s\S]*?\]);/);
          if (match && match[1]) {
            try {
              existingContent = match[1];
            } catch (e) {
              console.warn('Could not parse JSON array from JS file:', e);
              // Initialize as empty array if parsing failed
              existingContent = '[]';
            }
          } else {
            // Initialize as empty array if no match found
            existingContent = '[]';
          }
        }
      } catch (error) {
        // File doesn't exist yet or another error occurred
        if (error.status !== 404) {
          console.error('Error checking file:', error);
          statusEl.textContent = `❌ Error checking file: ${error.message || 'Unknown error'}`;
          statusEl.className = 'status error';
          return;
        }
        // 404 is expected if the file doesn't exist yet
        // Initialize as empty array
        existingContent = '[]';
      }
      
      // Prepare file content
      let fileContent;
      
      // If the file is a .js file, format it properly to store messages array
      if (path.endsWith('.js')) {
        let messagesArray;
        try {
          // Parse existing content as JSON array
          messagesArray = JSON.parse(existingContent);
          if (!Array.isArray(messagesArray)) {
            messagesArray = [];
          }
        } catch (e) {
          console.warn('Could not parse existing content as JSON array:', e);
          messagesArray = [];
        }
        
        // Add new message with timestamp
        messagesArray.push({
          content: newContent,
          timestamp: new Date().toISOString()
        });
        
        // Create the new file content
        fileContent = `// Saved messages - Last updated: ${new Date().toISOString()}\nwindow.savedMessages = ${JSON.stringify(messagesArray, null, 2)};`;
      } else {
        // For non-JS files, just append the new content with a timestamp
        const timestamp = new Date().toISOString();
        fileContent = existingContent ? `${existingContent}\n\n--- ${timestamp} ---\n${newContent}` : `--- ${timestamp} ---\n${newContent}`;
      }
      
      // Encode file content
      const encoded = btoa(unescape(encodeURIComponent(fileContent)));
      
      // Create or update the file
      const result = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: sha ? `Update ${path} - Add new message` : `Create ${path} - Initial message`,
        content: encoded,
        sha
      });
      
      // Show success message
      statusEl.textContent = `✅ Message ${sha ? 'added' : 'saved'} successfully!`;
      statusEl.className = 'status success';
      
      // Add link to the commit
      const commitUrl = result.data.commit.html_url;
      const linkElement = document.createElement('a');
      linkElement.href = commitUrl;
      linkElement.textContent = ' View commit';
      linkElement.target = '_blank';
      statusEl.appendChild(linkElement);
      
    } catch (error) {
      console.error('Error saving file:', error);
      statusEl.textContent = `❌ Error: ${error.message || 'Unknown error'}`;
      statusEl.className = 'status error';
    }
  });
  
  // Load button event listener
  loadBtn.addEventListener('click', async () => {
    // Validate inputs
    const inputs = validateInputs();
    if (!inputs) return;
    
    const { authToken, owner, repo, path } = inputs;
    
    // Set status to loading
    statusEl.textContent = '⏳ Loading from GitHub...';
    statusEl.className = 'status loading';
    
    try {
      // Create Octokit instance
      const octokit = createOctokit(authToken);
      
      // Get file content
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      
      if (!data.content) {
        statusEl.textContent = '❌ File exists but has no content';
        statusEl.className = 'status error';
        return;
      }
      
      // Decode the content
      const decoded = decodeURIComponent(escape(atob(data.content)));
      
      // If it's a JavaScript file, try to extract the messages array
      let extractedContent = decoded;
      if (path.endsWith('.js')) {
        const match = decoded.match(/window\.savedMessages\s*=\s*(\[[\s\S]*?\]);/);
        if (match && match[1]) {
          try {
            const messagesArray = JSON.parse(match[1]);
            if (Array.isArray(messagesArray) && messagesArray.length > 0) {
              // Format messages for display
              extractedContent = messagesArray.map(msg => 
                `--- ${msg.timestamp} ---\n${msg.content}`
              ).join('\n\n');
            } else {
              extractedContent = 'No messages found.';
            }
          } catch (e) {
            console.warn('Could not parse JSON array from JS file:', e);
            // Fall back to the raw content
          }
        }
      }
      
      // Update the textarea
      document.getElementById('userInput').value = extractedContent;
      
      // Show success message
      statusEl.textContent = '✅ Messages loaded successfully!';
      statusEl.className = 'status success';
      
    } catch (error) {
      console.error('Error loading file:', error);
      if (error.status === 404) {
        statusEl.textContent = '❌ File not found';
      } else {
        statusEl.textContent = `❌ Error: ${error.message || 'Unknown error'}`;
      }
      statusEl.className = 'status error';
    }
  });
})();
