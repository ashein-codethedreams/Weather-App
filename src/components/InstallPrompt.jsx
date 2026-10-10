import { useEffect, useState } from "react";

const InstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
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

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      setShowInstructions((visible) => !visible);
      return;
    }

    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (!installEvent && !isIos) return null;

  return (
    <div className="install-control">
      <button
        className="install-button"
        onClick={handleInstall}
        type="button"
      >
        <span aria-hidden="true">↓</span> Install app
      </button>
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
