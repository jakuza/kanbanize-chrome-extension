class XSSHelper {
    /*
     * This function returns stripped from HTML tags text
     * @param  {String} inputString String
     * @return {String} result
     */
    static stripHTMLTags(inputString) {
        if (!inputString || typeof inputString !== 'string') {
            return '';
        }

        let str = inputString.replace(/<br\s*\/?>/mg, '\n').replace(/&lt;|&gt;|&#60;|&#62;/gi, '').replace(/<\S\/?[^>]*(>|$)/mg, '').trim();

        return str;
    }

    /*
     * This function returns text with encoded quotes
     * @param  {inputString} input string
     * @return {String} result
     */
    static stripQuotes(inputString) {
        if (!inputString) {
            return '';
        }
        let tmp = inputString.replace(/["']/g, "");
        return tmp.trim();
    }

    /*
     * This function returns text stripped from backslashes
     * @param  {String} inputString String
     * @return {String} result
     */
    static stripBackslashes(inputString) {
        if (!inputString || typeof inputString !== 'string') {
            return '';
        }

        let str = inputString.replace(/\\/g, '');

        return str;
    }

    /*
     * This function returns text with encoded quotes and stripped tags
     * @param  {String} inputString String
     * @return {String} result
     */
    static stripHTMLAndQuotes(inputString) {
        if (!inputString || typeof inputString !== 'string') {
            return '';
        }

        return this.stripQuotes(this.stripHTMLTags(inputString));
    }

    /**
     * This function returns html entities of the following symbols [< > & "]
     * @param  {String} inputString String
     * @return {String} result;
     */
    static htmlEntities(inputString) {
        if (!inputString || typeof inputString !== 'string') {
            return '';
        }

        return String(inputString).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * This function returns sanitized string according to JSON standards
     * i.e. string with escaped " \ \n and so on
     * %5C === '\'  %22 === '"'  %00 === null
     * @param  {String} inputString String
     * @return {String} escaped json breaking characters result;
     */
    static escapeJson(inputString) {
        if (!inputString || typeof inputString !== 'string') {
            return '';
        }

        return inputString.replace(/[\\]/g, '\\\\')
            .replace(/%5C/g, '%5C%5C')
            .replace(/[\"]/g, '\\\"')
            .replace(/%22/g, '%5C%22')
            .replace(/[\/]/g, '\\/')
            .replace(/%00/g, '')
            .replace(/[\b]/g, '\\b')
            .replace(/[\f]/g, '\\f')
            .replace(/[\n]/g, '\\n')
            .replace(/[\r]/g, '\\r')
            .replace(/[\t]/g, '\\t');
    }

    /**
     * This function strips text from specific HTML tags
     * @param  {String} inputString String
     * @param  {String} allowedString - all tags we want to keep in lower case i.e. '<a><p>'
     * @return {String} result
     */
    static strip_tags(inputString, allowedString) {
        // making sure the allowedString arg is a string containing only tags in lowercase (<a><b><c>)
        allowedString = (((allowedString || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');

        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
        var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
        return inputString.replace(commentsAndPhpTags, '').replace(tags, function($0, $1) {
            return allowedString.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
    }
}