/* Progressive enhancement only: all forms work without JavaScript. */
'use strict';
document.querySelectorAll('[data-research-form]').forEach(function (form) {
  const message = form.querySelector('[name="message"]');
  const counter = form.querySelector('[data-character-count]');
  if (message && counter) {
    const update = function () { counter.textContent = message.value.length.toLocaleString() + ' / 2,000'; };
    message.addEventListener('input', update);
    update();
  }
  form.addEventListener('submit', function () {
    const status = form.querySelector('[data-submit-status]');
    if (status) status.textContent = 'Submitting your test. Please wait for your receipt.';
  });
});
