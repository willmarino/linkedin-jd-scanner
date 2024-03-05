// Each time we click on a new JD in the job search sidebar, the url changes
// Re-run the scan script every time this happens
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    // if(tab.active){
    //     console.log("active")
    //     console.log(changeInfo)
    // }
    if(changeInfo.status === "complete"){
        console.log("script rerun condition hit");
        // chrome.tabs.executeScript(tabId, { file: "scan_jd.js" });
        chrome.scripting.executeScript(
            {
                files: ["scripts/scan_jd.js"],
                target: { tabId }
            },
            function(){
                console.log("service worker script rerun complete :)")
            }
        )
    }
});