import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Global handler for copy button on generated code blocks
if (typeof window !== 'undefined') {
  (window as any).__copyCodeBlock = function (btn: HTMLElement) {
    const code = decodeURIComponent(btn.getAttribute('data-code') || '');
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      const span = btn.querySelector('span');
      const originalText = span ? span.innerText : 'Copy';
      if (span) span.innerText = 'Copied!';
      btn.classList.add('bg-emerald-500', 'text-black', 'border-emerald-400');

      setTimeout(() => {
        if (span) span.innerText = originalText;
        btn.classList.remove('bg-emerald-500', 'text-black', 'border-emerald-400');
      }, 2000);
    });
  };
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
