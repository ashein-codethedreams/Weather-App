import { useEffect, useState } from "react";

const InstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    const isAppleMobile =
      /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    setIsIos(isAppleMobile && !isStandalone);

    const handleInstallAvailable = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setShowInstructions(false);
    };
    const handleUpdateAvailable = (event) => {
      setWaitingWorker(event.detail);
    };

    if ("serviceWorker" in window.navigator) {
      window.navigator.serviceWorker.ready
        .then((registration) => {
          if (isMounted && registration.waiting) {
            setWaitingWorker(registration.waiting);
          }
        })
        .catch((error) => {
          console.error("Skyward could not check for a waiting app update:", error);
        });
    }

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("skyward:updateavailable", handleUpdateAvailable);
    return () => {
      isMounted = false;
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("skyward:updateavailable", handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    window.dispatchEvent(
      new CustomEvent("skyward:apply-update", { detail: waitingWorker })
    );
  };

  const handleInstall = async () => {
    if (!installEvent) {
      setShowInstructions((visible) => !visible);
      return;
    }

    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (!installEvent && !isIos && !waitingWorker) return null;

  return (
    <div className="install-control">
      {waitingWorker && (
        <button
          className="install-button"
          onClick={handleUpdate}
          type="button"
        >
          <span aria-hidden="true">↻</span> Update app
        </button>
      )}
      {(installEvent || isIos) && (
        <button
          className="install-button"
          onClick={handleInstall}
          type="button"
        >
          <span aria-hidden="true">↓</span> Install app
        </button>
      )}
      {showInstructions && (
        <div className="install-help" role="status">
          <p>
            Tap <strong>Share</strong>, then choose{" "}
            <strong>Add to Home Screen</strong>.
          </p>
          <button
            aria-label="Dismiss install instructions"
            onClick={() => setShowInstructions(false)}
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default InstallPrompt;
