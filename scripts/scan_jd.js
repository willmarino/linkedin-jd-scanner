// Pull desired YOE from
(async () => {

    // Stable data used for parsing html and text
    const listTypeTagNames = [ "ul", "ol" ];
    const experienceLanguageTerms = ["experience", "experienced"];
    const numberCharacters = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    // Helper function to test if character from string is a numeric character
    function isNum(char){
        return numberCharacters.includes(char);
    }

    // Helper function to pull number out of string, returns false if no number
    function getNumFromString(str){
        
        let numString = "";
        for(let i = 0; i < str.length; i++){
            const curChar = str[i];
            const prevChar = str[i - 1];

            const curCharIsNum = isNum(curChar);
            if(curCharIsNum){
                const prevCharExists = Boolean(prevChar);
                const prevCharIsNum = (prevCharExists) ? isNum(prevChar) : false;

                if(prevCharExists && prevCharIsNum){
                    numString += curChar;
                }else{
                    numString = curChar;
                }

            }else{ // if we have a number and encounter a non-number character, just return existing number
                if(numString.length > 0){
                    return parseInt(numString);
                }
            }
        }

        return (numString.length > 0) ? parseInt(numString) : false;
    }

    // Helper function for comparing to YOE numbers
    function getLargestValidNum(curNum, curMax){
        const YOE_MAX = 30; // If we parse out a number larger than this we picked up something we didn't want to (maybe year year "2024" or something similar)
        const curNumIsValid = ( curNum <= YOE_MAX );
        if( curNumIsValid ){
            if(!curMax){ // curMax (yoeNum var) is initialized to null
                return curNum;
            }else{
                return Math.max(curNum, curMax);
            }
        }else{
            return curMax;
        }

    }


    // Helper function for writing to job card sidebar elements
    function writeYoeDisplay(yoeNum){

        // Get the sidebar card we care about
        const selectedSidebarCardCollection = document.getElementsByClassName("jobs-search-results-list__list-item--active"); // Actively highlighted element
        if(selectedSidebarCardCollection.length === 0){
            console.log("failure");
            return;
        }
        const selectedSidebarCard = selectedSidebarCardCollection[0];

        // Grab footer element from the children of the sidebar card
        let footerElement;
        for(let i = 0; i < selectedSidebarCard.children.length; i++){
            const childElement = selectedSidebarCard.children[i];
            const childElementClassList = childElement.classList;
            
            for(let j = 0;j < childElementClassList.length; j++){
                const curClassName = childElementClassList[j];
                if(curClassName.includes("job-card-list__footer-wrapper")){
                    footerElement = childElement;
                }
            }
        }

        // If we have not already appended the YOE info to the footer, then do so
        const lastFooterChild = footerElement.children[footerElement.children.length - 1];
        const infoAlreadyWritten = lastFooterChild.textContent.includes("YOE");

        if(!infoAlreadyWritten){
            const newFooterChild = document.createElement("li");
            newFooterChild.textContent = `YOE desired: ${yoeNum || "No information provided"}`;
    
            const footerChildClassList = footerElement.children[0].classList;
            for(let i = 0; i < footerChildClassList.length; i++){
                const curClassName = footerChildClassList[i];
                newFooterChild.classList.add(curClassName);
            }
            
            footerElement.appendChild(newFooterChild);
        }

    }


    // Try to parse html and pull out job description elements, these load via some js after the html's load event fires
    // So we have to wait some additional time for it to be in the DOM before pulling it out
    // Current method of ensuring (within reason) that the info exists is to wait 1 second each time the content is not yet loaded, and then try again (max 3 times)
    let jd;
    let jdSpan;
    let allJDContentLoaded = false;
    let numTimesWaitedForPageLoad = 0;
    while( !allJDContentLoaded && (numTimesWaitedForPageLoad < 30) ){
        jd = document.getElementById("job-details");
        if(!jd){
            await new Promise(r => setTimeout(r, 100))
        }else{
            jdSpan = jd.querySelectorAll("span")[0];
            if(jdSpan){
                allJDContentLoaded = true;
            }
        }
    }
    
    if(!jdSpan){
        console.log(`Unable to find JD text, not scanning`);
        return;
    }

    // Collect lines of text so each bullet can be parsed individually
    const manuallyCollectedTextLines = [];
    const spanChildren = jdSpan.children;
    for(const child of spanChildren){
        const tagName = child.tagName.toLowerCase();

        if(listTypeTagNames.includes(tagName)){
            const grandChildren = child.children;

            for(const gc of grandChildren){
                manuallyCollectedTextLines.push(gc.textContent);
            }

        }else{
            manuallyCollectedTextLines.push(child.textContent);
        }
    }

    // Parse lines of text, find numbers attached to experience terms
    // Return greatest number which stands alone ("2 years", "2+ years") or starts a range ("2-4 years", "2 - 4 years")
    let yoeNum = null;
    for(const tl of manuallyCollectedTextLines){
        const textLineContainsExpTerm = experienceLanguageTerms.some(t => tl.includes(t));
        if(!textLineContainsExpTerm) continue;
        
        // Iterate through each word in line
        const tlWords = tl.split(" ");
        for(let i = 0; i < tlWords.length; i++){
            const curWord = tlWords[i];
            const wordChars = curWord.split("");
            const wordNum = getNumFromString(curWord);
            if(!wordNum) continue; // If we get past here, the word has a number in it
            
            // Is the single word a range? ("2-4")
            const wordIsRange = wordChars.includes("-") &&
                curWord.split("-").every((charGroup) => getNumFromString(charGroup));

            if(wordIsRange){ // process single word ranges
                const charGroups = curWord.split("-");
                const firstCharGroup = charGroups[0];
                const rangeStartNum = getNumFromString(firstCharGroup)
                yoeNum = getLargestValidNum(rangeStartNum, yoeNum);

            }else if(!wordIsRange){
                // Is the word the ending of multi-word range? ("2 - 4")
                const prevTwoWords = [];
                for(let j = 1; j < 3; j++){
                    const idx = i - j;
                    const wordAtIdx = (tlWords[idx]) ? tlWords[idx] : ""; // forces it to be the case that there will always be 'two previous words' for logic to run on
                    prevTwoWords.unshift(wordAtIdx);
                }

                const rangeStartNum = getNumFromString(prevTwoWords[0]);

                const wordIsEndOfRange = rangeStartNum &&
                    (wordIsEndOfRange[1].includes("-") || wordIsEndOfRange[1].includes("to"));
                
                if(wordIsEndOfRange){ // cur word has a number, is the end of a valid range, and the word two words before has a number
                    yoeNum = getLargestValidNum(rangeStartNum, yoeNum);
                
                }else{ // simplest outcome, just parse lone number
                    yoeNum = getLargestValidNum(wordNum, yoeNum);
                }
            }

        }
    }

    // console.log(`JD Scanner finished running, this listing wants ${yoeNum} YOE`);
    writeYoeDisplay(yoeNum);

})();
