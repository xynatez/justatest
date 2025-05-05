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
    const content = document.getElementById('userInput').value;
    
    // Set status to loading
    statusEl.textContent = '⏳ Saving to GitHub...';
    statusEl.className = 'status loading';
    
    try {
      // Create Octokit instance
      const octokit = createOctokit(authToken);
      
      // Prepare file content
      let fileContent;
      
      // If the file is a .js file, format it with a window variable
      if (path.endsWith('.js')) {
        fileContent = `// Saved user input - Last updated: ${new Date().toISOString()}\nwindow.savedInput = ${JSON.stringify(content)};`;
      } else {
        fileContent = content;
      }
      
      // Encode file content
      const encoded = btoa(unescape(encodeURIComponent(fileContent)));
      
      // Get file SHA if it exists
      let sha;
      try {
        const { data: existing } = await octokit.repos.getContent({ owner, repo, path });
        sha = existing.sha;
      } catch (error) {
        // File doesn't exist yet or another error occurred
        if (error.status !== 404) {
          console.error('Error checking file:', error);
          statusEl.textContent = `❌ Error checking file: ${error.message || 'Unknown error'}`;
          statusEl.className = 'status error';
          return;
        }
        // 404 is expected if the file doesn't exist yet
      }
      
      // Create or update the file
      const result = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: sha ? `Update ${path}` : `Create ${path}`,
        content: encoded,
        sha
      });
      
      // Show success message
      statusEl.textContent = `✅ File ${sha ? 'updated' : 'created'} successfully!`;
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
      
      // If it's a JavaScript file, try to extract the value
      let extractedContent = decoded;
      if (path.endsWith('.js')) {
        const match = decoded.match(/window\.savedInput\s*=\s*([^;]+);/);
        if (match && match[1]) {
          try {
            extractedContent = JSON.parse(match[1]);
          } catch (e) {
            console.warn('Could not parse JSON value from JS file:', e);
            // Fall back to the raw content
          }
        }
      }
      
      // Update the textarea
      document.getElementById('userInput').value = extractedContent;
      
      // Show success message
      statusEl.textContent = '✅ File loaded successfully!';
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
