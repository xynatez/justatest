(async () => {
  // Ganti dengan Fine‑grained PAT kamu (scope: repo)
  const authToken = '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';

  // Repo sudah di-set:
  const owner = 'xynatez';
  const repo = 'justatest';
  const path = 'data.js';

  // Inisialisasi Octokit
  const octokit = new Octokit.Rest({ auth: authToken });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const content = document.getElementById('userInput').value.trim();

    if (!content) {
      document.getElementById('status').textContent = '⚠️ Input kosong.';
      return;
    }

    const fileContent = `// Saved user input\nwindow.savedInput = ${JSON.stringify({ userInput: content }, null, 2)};`;
    const encoded = btoa(unescape(encodeURIComponent(fileContent)));

    let sha;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path });
      sha = existing.sha;
    } catch {
      // file belum ada
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
      document.getElementById('status').textContent = '❌ Error saving file. Lihat console.';
    }
  });
})();
