var fs = require('fs');
var path = require('path');
var loaderUtils = require('loader-utils');
var Vulcanize = require('vulcanize');


module.exports = function () {
    var loader = this;
    var query = loaderUtils.parseQuery(this.query);
    var callback = this.async();

    this.cacheable && this.cacheable();

    function processVulcanizedStyles(content) {
        var assets = {};

        (content.match(/<style>[.\s\S]*?<\/style>/gm) || [])
            .forEach(function (style) {
                var parsed = style, assetUri, assetContent, interpolatedUri;

                (style.match(/url\(".*?"\)/g) || []).forEach(function (assetUrl) {
                    assetUri = assetUrl.replace(/^.*?"/, '').replace(/(\??#.*)?".*$/, '');

                    if (!assets[assetUri]) {
                        assetContent = fs.readFileSync(path.resolve(loader.options.context, assetUri));
                        interpolatedUri = loaderUtils.interpolateName(
                            {
                                resourcePath: assetUri
                            },
                            query.assetName || 'assets/[name].[ext]',
                            {
                                context: loader.options.context,
                                content: assetContent
                            });

                        assets[assetUri] = {
                            content: assetContent,
                            interpolated: interpolatedUri,
                            publicPath: "__webpack_public_path__ + " + JSON.stringify(interpolatedUri)
                        };

                        loader.emitFile(interpolatedUri, assetContent);
                    }

                    parsed = parsed.replace(assetUrl, assetUrl.replace(assetUri, assets[assetUri].interpolated));
                });

                content = content.replace(style, parsed);
            });
        return content;
    }


    new Vulcanize({
        stripExcludes: true,
        inlineScripts: true,
        inlineCss: true,
        stripComments: true
    }).process(this.resourcePath, function (err, content) {
        if (err) {
            callback(err);
            return;
        }

        content = processVulcanizedStyles(content);

        var url = loaderUtils.interpolateName(loader, query.name || '[name].[ext]', {
            context: loader.options.context,
            content: content
        });

        var publicPath = "__webpack_public_path__ + " + JSON.stringify(url);

        loader.emitFile(url, content);

        callback(null, 'module.exports = ' + publicPath + ';')
    });
}