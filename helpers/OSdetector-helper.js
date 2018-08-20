class OSHelper {
    /*
     * This function returns the user's OS
     * @return {String} OSName
     */
    static getOSName() {
        let OSName = 'Unknown OS';

        if (navigator.appVersion.indexOf('Win') !== -1) {
            OSName = 'Windows';
        }

        if (navigator.appVersion.indexOf('Mac') !== -1) {
            OSName = 'MacOS';
        }

        if (navigator.appVersion.indexOf('Linux') !== -1) {
            OSName = 'Linux';
        }

        return OSName;
    }

    static getActualWidth() {
        var actualWidth = window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth ||
            document.body.offsetWidth;

        return actualWidth;
    }
}