import { app, autoUpdater, dialog } from "electron";

const server = "https://hazel-owlbear-rodeo.vercel.app/";
const url = `${server}/update/${process.platform}/${app.getVersion()}`;

autoUpdater.setFeedURL({ url });

setInterval(() => {
  autoUpdater.checkForUpdates();
}, 1200000);

autoUpdater.on("update-downloaded", (_, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: "info",
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message: process.platform === "win32" ? releaseNotes : releaseName,
    detail:
      "A new version has been downloaded. Restart the application to apply the updates.",
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on("error", (message) => {
  console.error("There was a problem updating the application");
  console.error(message);
});
