const checkbox = document.getElementById('auto-redirect');

chrome.storage.local.get('auto-redirect', (data) => {
  checkbox.checked = !!data['auto-redirect'];
});

checkbox.addEventListener('change', () => {
  chrome.storage.local.set({ 'auto-redirect': checkbox.checked });
});
