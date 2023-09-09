//
//  app.js
//  altsource-viewer (https://github.com/therealFoxster/altsource-viewer)
//
//  Copyright (c) 2023 Foxster.
//  MIT License.
//

import { urlSearchParams, sourceURL, legacyPermissions } from "./constants.js";
import { formatString, insertSpaceInCamelString, insertSpaceInSnakeString, exit, formatVersionDate } from "./utilities.js";
import { main } from "./main.js";
import { privacy, entitlements } from "./constants.js";
import { AppPermissionItem } from "./components/AppPermissionItem.js";

if (!urlSearchParams.has('id')) exit();
const bundleId = urlSearchParams.get('id');

(function () {
    // Hide/show navigation bar title & install button
    let hidden = false;
    window.onscroll = function (e) {
        const appName = document.querySelector(".app-header .text>.title");
        const title = document.getElementById("title");
        const button = document.querySelector("#nav-bar .install");

        if (hidden && appName.getBoundingClientRect().y >= 72) { // App name not visible
            hidden = false;
            title.classList.add("hidden");
            button.classList.add("hidden");
            button.disaled = true;
        } else if (!hidden && appName.getBoundingClientRect().y < 72) {
            hidden = true;
            title.classList.remove("hidden");
            button.classList.remove("hidden");
            button.disaled = false;
        }
    }
})();

main((json) => {
    const app = getAppWithBundleId(bundleId);
    if (!app) exit();

    // If has multiple versions, show the latest one
    if (app.versions) {
        const latestVersion = app.versions[0];
        app.version = latestVersion.version;
        app.versionDate = latestVersion.date;
        app.versionDescription = latestVersion.localizedDescription;
        app.downloadURL = latestVersion.downloadURL;
        app.size = latestVersion.size;
    }

    // Set tab title
    document.title = `${app.name} - ${json.name}`;

    const tintColor = `#${app.tintColor?.replaceAll("#", "")}`;
    // Set tint color
    if (tintColor) document.querySelector(':root').style.setProperty("--app-tint-color", `${tintColor}`);

    // Tint back button
    document.getElementById("back").style.color = tintColor;

    // Set up install buttons
    document.querySelectorAll("a.install").forEach(button => {
        button.href = `altstore://install?url=${app.downloadURL}`;
    });

    // Set up download button
    document.getElementById("download").href = app.downloadURL;

    // 
    // Navigation bar
    const navigationBar = document.getElementById("nav-bar");
    // Title
    navigationBar.querySelector("#title>p").textContent = app.name;
    // App icon
    navigationBar.querySelector("#title>img").src = app.iconURL;
    // Install button
    navigationBar.querySelector(".uibutton").style.backgroundColor = `${tintColor}`;

    // 
    // App header
    const appHeader = document.querySelector("#main .app-header");
    // Icon
    appHeader.querySelector("img").src = app.iconURL;
    // App name
    appHeader.querySelector(".title").textContent = app.name;
    // Developer name
    appHeader.querySelector(".subtitle").textContent = app.developerName;
    // Install button
    appHeader.querySelector(".uibutton").style.backgroundColor = tintColor;
    // Background
    appHeader.querySelector(".background").style.backgroundColor = tintColor;

    const more = `
    <a id="more" onclick="revealTruncatedText(this);">
        <button style="color: ${tintColor};">more</button>
    </a>`;

    window.revealTruncatedText = moreButton => {
        const textId = moreButton.parentNode.id;
        const text = document.getElementById(textId);
        text.style.display = "block";
        text.style.overflow = "auto";
        text.style.webkitLineClamp = "none";
        text.style.lineClamp = "none";
        text.removeChild(moreButton)
    }

    // 
    // Preview
    const preview = document.getElementById("preview");
    // Subtitle
    preview.querySelector("#subtitle").textContent = app.subtitle;
    // Screenshots
    app.screenshotURLs.forEach(url => {
        preview.querySelector("#screenshots").insertAdjacentHTML("beforeend", `<img src="${url}" alt="" class="screenshot">`);
    });
    // Description
    const previewDescription = preview.querySelector("#description");
    previewDescription.innerHTML = formatString(app.localizedDescription);
    if (previewDescription.scrollHeight > previewDescription.clientHeight)
        previewDescription.insertAdjacentHTML("beforeend", more);

    // 
    // Version info
    const versionDateElement = document.getElementById("version-date");
    const versionNumberElement = document.getElementById("version");
    const versionSizeElement = document.getElementById("version-size");
    const versionDescriptionElement = document.getElementById("version-description");

    // Version date
    versionDateElement.textContent = formatVersionDate(app.versionDate);

    // Version number
    versionNumberElement.textContent = `Version ${app.version}`;

    // Version size
    const units = ["B", "KB", "MB", "GB"];
    var appSize = app.size, i = 0;
    while (appSize > 1024) {
        i++;
        appSize = parseFloat(appSize / 1024).toFixed(1);
    }
    // versionSizeElement.textContent = `${appSize} ${units[i]}`;

    // Version description
    versionDescriptionElement.innerHTML = formatString(app.versionDescription);
    if (versionDescriptionElement.scrollHeight > versionDescriptionElement.clientHeight)
        versionDescriptionElement.insertAdjacentHTML("beforeend", more);

    // Version history
    document.getElementById("version-history").href = `version-history.html?source=${sourceURL}&id=${app.bundleIdentifier}`;

    // 
    // Permissions

    // 
    // Privacy
    const privacyContainer = document.getElementById("privacy");
    if (app.appPermissions?.privacy?.length || app.permissions) {
        privacyContainer.querySelector(".permission-icon").classList = "permission-icon bi-person-fill-lock";
        privacyContainer.querySelector("b").innerText = "Privacy";
        privacyContainer.querySelector(".description").innerText = `"${app.name}" may request to access the following:`;
    }
    app.appPermissions?.privacy?.forEach(privacyPermission => {
        const permission = privacy[privacyPermission.name];
        let name = permission?.name ?? insertSpaceInCamelString(privacyPermission.name),
            icon;
        if (permission?.icon) icon = permission.icon;
        else icon = "gear-wide-connected";
        privacyContainer.querySelector(".permission-items").insertAdjacentHTML("beforeend", 
            AppPermissionItem(name, icon, privacyPermission?.usageDescription)
        );
    });

    //
    // Legacy permissions
    if (!app.appPermissions?.privacy) {
        app.permissions?.forEach(appPermission => {
            const permission = legacyPermissions[appPermission.type];
            let name = insertSpaceInSnakeString(appPermission.type),
                icon;
            if (permission?.icon) icon = permission.icon;
            else icon = "gear-wide-connected";
            privacyContainer.querySelector(".permission-items").insertAdjacentHTML("beforeend", 
                AppPermissionItem(name, icon, appPermission?.usageDescription)
            );
        });
    }

    //
    // Entitlements
    const entitlementsContainer = document.getElementById("entitlements");
    if (!app.appPermissions?.entitlements?.length) entitlementsContainer.remove();
    app.appPermissions?.entitlements.forEach(entitlementPermission => {
        const permission = entitlements[entitlementPermission.name];
        let name = permission?.name ?? insertSpaceInSnakeString(entitlementPermission.name),
            icon;
        if (permission?.icon) icon = permission.icon;
        else icon = "gear-wide-connected";;
        entitlementsContainer.querySelector(".permission-items").insertAdjacentHTML("beforeend", 
            AppPermissionItem(name, icon, permission?.description)
        );
    });

    //
    // Source info
    const source = document.getElementById("source");
    const sourceContainer = source.querySelector(".container");
    const sourceTitle = source.querySelector(".row-title");
    const sourceSubtitle = source.querySelector(".row-subtitle");
    sourceTitle.innerText = json.name;
    sourceContainer.href = `index.html?source=${sourceURL}`;
    sourceSubtitle.innerText = json.description ?? "Tap to get started";
});
