(function () {
  'use strict';
  // Runs in the page's MAIN world (declared in manifest with "world": "MAIN").
  // Receives postMessages from the isolated-world content script and performs
  // React prop interactions that require main-world access to __reactProps$xxx.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.__job_autofill !== 'rippling') return;
    var step = e.data.step;
    var result = { __job_autofill_result: 'rippling', step: step, ok: false };
    try {
      if (step === 'open_dropdown') {
        var div = document.querySelector('[data-testid="phone_number-code"]');
        var ctrl = div && div.querySelector('[data-testid="select-controller"]');
        var k = ctrl && Object.keys(ctrl).find(function (key) { return key.startsWith('__reactProps'); });
        if (k) { ctrl[k].onClick(new MouseEvent('click', { bubbles: true, cancelable: true })); result.ok = true; }
      } else if (step === 'click_israel') {
        var all = Array.from(document.querySelectorAll('[role="listbox"]'));
        var lb = all.find(function (lb) {
          return Array.from(lb.querySelectorAll('li')).some(function (li) { return /^\+\d/.test(li.innerText.trim()); });
        });
        var opt = lb && Array.from(lb.querySelectorAll('li')).find(function (li) { return /\+972/.test(li.innerText); });
        var k = opt && Object.keys(opt).find(function (key) { return key.startsWith('__reactProps'); });
        if (k) { opt[k].onClick(new MouseEvent('click', { bubbles: true, cancelable: true })); result.ok = true; }
        result.lbFound = !!lb;
        result.optFound = !!opt;
      }
    } catch (err) {
      result.error = err.message;
    }
    window.postMessage(result, '*');
  });
})();
