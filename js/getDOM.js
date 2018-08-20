(function() {
    'use strict';

    let html = "";
    let selectionTH = {};
    if (typeof window.getSelection != "undefined") {
        let sel = window.getSelection();
        if (sel.rangeCount) {
            let container = document.createElement("div");
            for (let i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }

    selectionTH = {
        selText: window.getSelection().toString(),
        selHTML: html,
        url: window.location.href
    };

    chrome.storage.local.set({
        txt: selectionTH.selText,
        htm: selectionTH.selHTML,
        url: selectionTH.url
    });

    return selectionTH;
}());
