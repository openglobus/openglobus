'use strict';

const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const LIBRARY_NAME = 'og';

module.exports = {
    entry: path.resolve(__dirname, 'src/og/index.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: LIBRARY_NAME + ".js",
        library: LIBRARY_NAME,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new ExtractTextPlugin(LIBRARY_NAME + ".css")
    ],
    optimization: {
        usedExports: true,
        concatenateModules: true,
        occurrenceOrder: true
    },
    stats: {
        maxModules: Infinity,
        optimizationBailout: true
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
                fallback: 'style-loader',
                use: [{
                    loader: 'css-loader',
                    options: {
                        importLoaders: 1,
                        minimize: true
                    }
                }]
            })
        }]
    }
};
