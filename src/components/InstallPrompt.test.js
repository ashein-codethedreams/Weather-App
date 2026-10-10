import { act, fireEvent, render, screen } from "@testing-library/react";
import InstallPrompt from "./InstallPrompt";

test("offers the browser install prompt when it becomes available", async () => {
  render(<InstallPrompt />);
  expect(screen.queryByRole("button", { name: /install app/i })).not.toBeInTheDocument();

  const installEvent = new Event("beforeinstallprompt", { cancelable: true });
  installEvent.prompt = jest.fn().mockResolvedValue();
  installEvent.userChoice = Promise.resolve({ outcome: "accepted" });

  act(() => {
    window.dispatchEvent(installEvent);
  });

  expect(installEvent.defaultPrevented).toBe(true);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /install app/i }));
  });
  expect(installEvent.prompt).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: /install app/i })
  ).not.toBeInTheDocument();
});

test("offers an update when a new app version is ready", () => {
  render(<InstallPrompt />);
  const waitingWorker = { postMessage: jest.fn() };

  act(() => {
    window.dispatchEvent(
      new CustomEvent("skyward:updateavailable", { detail: waitingWorker })
    );
  });

  const updateEvent = jest
    .spyOn(window, "dispatchEvent")
    .mockImplementation(() => true);
  fireEvent.click(screen.getByRole("button", { name: /update app/i }));

  expect(updateEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "skyward:apply-update",
      detail: waitingWorker,
    })
  );
  updateEvent.mockRestore();
});
