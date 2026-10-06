/**
 * CyberPingo Client Anti-Tamper & Clone Defense
 * Protects frontend runtime from framing, clickjacking, and rogue mirroring.
 */

export const ANTI_TAMPER_SCRIPT = `
(function() {
  'use strict';
  // 1. Anti-Framing / Frame Busting
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location.href;
    }
  } catch (e) {
    // Sandboxed iframe: block rendering
    document.documentElement.style.display = 'none';
    throw new Error('Framing prohibited by CyberPingo Security Policy');
  }

  // 2. Self-XSS Warning in Browser Console
  if (typeof console !== 'undefined' && console.warn) {
    console.log('%c🛡️ CYBERPINGO SECURITY GUARD ACTIVE', 'color: #00BFFF; font-size: 16px; font-weight: bold; background: #0b1329; padding: 6px 12px; border-radius: 4px;');
    console.log('%cATTENTION: Ne collez aucun code ou script dans cette console. Les attaques par ingénierie sociale (Self-XSS) peuvent compromettre votre compte.', 'color: #F59E0B; font-size: 12px; font-weight: bold;');
  }

  // 3. Domain Integrity Validation
  try {
    var allowedHosts = ['cyberpingo.vercel.app', 'localhost', '127.0.0.1'];
    var currentHost = window.location.hostname.toLowerCase();
    var isAllowed = allowedHosts.some(function(host) {
      return currentHost === host || currentHost.endsWith('.' + host) || currentHost.endsWith('.vercel.app');
    });
    if (!isAllowed) {
      console.error('ALERTE: Hôte non autorisé détecté. Miroir ou clone potentiel de CyberPingo.');
    }
  } catch (err) {}
})();
`;
