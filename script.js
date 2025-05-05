// script.js
(async () => {
  // First, import the Octokit library from CDN
  const { Octokit } = await import('https://cdn.skypack.dev/@octokit/rest');
  
  // Your authentication token (note: you should not expose tokens in client-side code)
  const authToken = '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';
  
  // Repository settings
  const owner = 'xynatez';
  const repo = 'justatest';
  const path = 'data.js';
  
  // Initialize Octokit with your auth token
  const octokit = new Octokit({ auth: authToken });
  
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const content = document.getElementById('userInput').value;
    const fileContent = `// Saved user input\nwindow.savedInput = ${JSON.stringify(content)};`;
    const encoded = btoa(unescape(encodeURIComponent(fileContent)));
    
    let sha;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path });
      sha = existing.sha;
    } catch {
      // file doesn't exist yet
    }
    
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: sha ? 'Update data.js' : 'Create data.js',
        content: encoded,
        sha
      });
      document.getElementById('status').textContent = '✅ Saved successfully!';
    } catch (error) {
      console.error(error);
      document.getElementById('status').textContent = '❌ Error saving file. See console for details.';
    }
  });
})();
