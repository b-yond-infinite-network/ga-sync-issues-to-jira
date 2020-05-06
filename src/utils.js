function sliceInput(rawText) {
    let slicesResult = []
    let currentParameters = rawText
    let snippet = null

    while ((snippet = /(?:,\s?)*(?<paramValue>[a-zA-Z1-9-]+\s*[a-zA-Z1-9-]*)/g.exec(currentParameters))) {
        if (snippet.groups.paramValue) {
            slicesResult.push(snippet.groups.paramValue.trim())
            currentParameters = currentParameters.replace(snippet.groups.paramValue, '')
        }
    }

    return slicesResult
}

module.exports = sliceInput