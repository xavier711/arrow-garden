const helpDialog = document.getElementById('help-dialog');
document.getElementById('help').addEventListener('click', () => helpDialog.showModal());
const installButton = document.getElementById('install');
const fullscreenButton = document.getElementById('fullscreen');
const status = document.getElementById('install-status');
const offlineStatus = document.getElementById('offline-status');
const startDialog = document.getElementById('start-dialog');
const installDialog = document.getElementById('install-dialog');
const fullscreenMode = matchMedia('(display-mode: fullscreen)');
const standaloneMode = matchMedia('(display-mode: standalone)');
let installPrompt;
// display-mode: fullscreen also matches a normal tab using the Fullscreen API.
let installed = navigator.standalone === true;
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const appMode = () => installed || standaloneMode.matches || (fullscreenMode.matches && !fullscreenElement());
const canFullscreen = () => Boolean(
  (document.fullscreenEnabled && document.documentElement.requestFullscreen) ||
  (document.webkitFullscreenEnabled && document.documentElement.webkitRequestFullscreen)
);

function notice(text) {
  status.textContent = text;
  status.hidden = !text;
}

function updateControls() {
  const fullscreen = Boolean(fullscreenElement());
  fullscreenButton.hidden = !canFullscreen() || (fullscreenMode.matches && !fullscreen);
  fullscreenButton.setAttribute('aria-label', fullscreen ? '退出全屏' : '全屏玩游戏');
  fullscreenButton.setAttribute('title', fullscreen ? '退出全屏' : '全屏玩游戏');
  fullscreenButton.setAttribute('aria-pressed', String(fullscreen));
  installButton.hidden = appMode();
  installButton.textContent = installPrompt ? '安装到主屏幕 ↗' : '添加到主屏幕 · 查看方法';
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  updateControls();
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) {
    installDialog.showModal();
    return;
  }
  const prompt = installPrompt;
  installPrompt = undefined;
  updateControls();
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') notice('安装后，从主屏幕的“箭头出发”打开就可以啦。');
  } catch {
    installDialog.showModal();
  }
});

window.addEventListener('appinstalled', () => {
  installed = true;
  installPrompt = undefined;
  updateControls();
  notice('已安装！下次点主屏幕上的小箭头就能玩。');
});

async function enterFullscreen() {
  try {
    const root = document.documentElement;
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else await root.webkitRequestFullscreen();
    notice('');
  } catch {
    notice('浏览器未能进入全屏，可以继续玩，或查看“添加到主屏幕”的方法。');
  }
  updateControls();
}

fullscreenButton.addEventListener('click', async () => {
  if (!fullscreenElement()) return enterFullscreen();
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await document.webkitExitFullscreen();
  } catch {
    notice('可使用浏览器的返回或退出全屏操作。');
  }
  updateControls();
});
document.getElementById('start-fullscreen').addEventListener('click', () => {
  startDialog.close();
  // Invoke synchronously inside the click: browsers require user activation.
  void enterFullscreen();
});
document.addEventListener('fullscreenchange', updateControls);
document.addEventListener('webkitfullscreenchange', updateControls);
fullscreenMode.addEventListener('change', updateControls);
standaloneMode.addEventListener('change', updateControls);
updateControls();
if (!appMode() && canFullscreen()) startDialog.showModal();

// Development intentionally avoids a worker. Preview/build supports offline play.
const build = document.querySelector('meta[name="app-build"]')?.content;
let offlineReady = false;
function updateOfflineStatus() {
  offlineStatus.textContent = offlineReady
    ? (navigator.onLine === false ? '当前离线，可以继续玩' : '已准备好离线游玩')
    : '正在准备离线游玩，请保持联网…';
}
if (!build || build === 'development') {
  offlineStatus.textContent = '开发预览：离线游玩需使用发布版本';
} else if (!('serviceWorker' in navigator) || !window.isSecureContext) {
  offlineStatus.textContent = '当前无法准备离线游玩，请用支持离线功能的浏览器打开 HTTPS 网址';
} else {
  updateOfflineStatus();
  window.addEventListener('online', () => { if (offlineReady) updateOfflineStatus(); });
  window.addEventListener('offline', () => { if (offlineReady) updateOfflineStatus(); });
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), {
        scope: new URL('../', import.meta.url).href, updateViaCache: 'none'
      });
      const notifyUpdate = () => notice('有新版本啦，玩完后关闭所有游戏页面，再打开就能更新。');
      const failed = () => {
        if (!offlineReady) offlineStatus.textContent = '离线准备未完成，请联网后重新打开游戏';
      };
      const watchWorker = worker => {
        if (!worker) return;
        const changed = () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate();
          if (worker.state === 'redundant') failed();
        };
        worker.addEventListener('statechange', changed);
        changed();
      };
      if (registration.waiting) notifyUpdate();
      watchWorker(registration.installing);
      registration.addEventListener('updatefound', () => watchWorker(registration.installing));
      // Activation follows successful precaching of the entire release.
      await navigator.serviceWorker.ready;
      offlineReady = true;
      updateOfflineStatus();
    } catch {
      offlineStatus.textContent = '离线准备未完成，请联网后重新打开游戏';
    }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}
