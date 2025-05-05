(async () => {
  // Ganti dengan Fine‑grained PAT-mu (scope: repo)
  const authToken = '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';

  // Repo sudah di-set:
  const owner = 'xynatez';
  const repo = 'justatest';
  const path = 'data.js';  // Path file yang akan disimpan

  const octokit = new Octokit.Octokit({ auth: authToken });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    // Ambil input pengguna
    const content = document.getElementById('userInput').value;

    // Format data yang akan disimpan
    const fileContent = `// Saved user input\nwindow.savedInput = ${JSON.stringify({ userInput: content })};`;

    // Encode fileContent ke base64
    const encoded = btoa(unescape(encodeURIComponent(fileContent)));

    let sha;
    try {
      // Cek apakah file sudah ada
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path });
      sha = existing.sha; // Ambil SHA file yang ada
    } catch {
      // File belum ada, tidak ada SHA
    }

    try {
      // Simpan atau update file ke GitHub
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: sha ? 'Update data.js' : 'Create data.js', // Pesan commit
        content: encoded,
        sha // SHA untuk update file
      });

      document.getElementById('status').textContent = '✅ Saved successfully!';
    } catch (error) {
      console.error(error);
      document.getElementById('status').textContent = '❌ Error saving file. Lihat console.';
    }
  });
})();
