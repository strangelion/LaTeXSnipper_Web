async function loadBuildInfo() {
  const fields = {
    coreVersion: document.getElementById('coreVersion'),
    coreCommit: document.getElementById('coreCommit'),
    wasmApiVersion: document.getElementById('wasmApiVersion'),
    documentSchemaVersion: document.getElementById('documentSchemaVersion'),
  };

  try {
    const response = await fetch('/core-wasm/core-build.json', {
      cache: 'no-cache',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const info = await response.json();
    fields.coreVersion.textContent = info.coreVersion;
    fields.coreCommit.textContent = info.gitCommit;
    fields.wasmApiVersion.textContent = String(info.wasmApiVersion);
    fields.documentSchemaVersion.textContent = info.documentSchemaVersion;
  } catch (error) {
    for (const field of Object.values(fields)) field.textContent = '不可用';
    document.getElementById('buildInfoError').textContent =
      `无法读取构建信息：${error.message}`;
  }
}

loadBuildInfo();
