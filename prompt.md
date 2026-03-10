setx PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH "C:\Users\<you>\AppData\Local\ms-playwright\chromium-1200\chrome-win\chrome.exe"
setx PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD 1

node -e "console.log(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)"