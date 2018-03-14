'use strict';

const webpack = require('webpack');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV.trim().toLowerCase() || 'development';

const libraryName = 'og';

if (NODE_ENV == "development") {

    let outputFile = libraryName + '.js';

    module.exports = {
        entry: __dirname + "/src/og/index.js",
        output: {
            path: __dirname + '/dist',
            filename: outputFile,
            library: libraryName
        },
        watch: true,
        watchOptions: {
            aggregateTimeout: 100
        },
        devtool: "source-map",
        plugins: [
            new webpack.NoEmitOnErrorsPlugin(),
            new webpack.DefinePlugin({
                'NODE_ENV': JSON.stringify(NODE_ENV)
            }),
            new webpack.optimize.ModuleConcatenationPlugin()
        ],
        resolve: {
            extensions: ['.js']
        }
    };

} else if (NODE_ENV == "production") {

    const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

    let outputFile = libraryName + '.min.js';

    module.exports = {
        entry: __dirname + "/src/og/index.js",
        output: {
            path: __dirname + '/dist',
            filename: outputFile,
            library: libraryName//,
            //libraryTarget: 'umd',
            //umdNamedDefine: true
        },
        plugins: [
            new webpack.DefinePlugin({
                'NODE_ENV': JSON.stringify(NODE_ENV)
            }),
            new webpack.optimize.ModuleConcatenationPlugin(),
            new UglifyJsPlugin(),
        ]
    };
}