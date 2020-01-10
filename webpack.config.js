'use strict';

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const version = require('./package.json').version;

const LIBRARY_NAME = 'og';

var config = (lib) => {

    return {
        entry: path.resolve(__dirname, 'src/og/index' + lib + '.js'),
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: LIBRARY_NAME + lib + '-' + version + '.js',
            library: LIBRARY_NAME,
            libraryTarget: 'umd',
            umdNamedDefine: true
        },
        plugins: [
            new webpack.optimize.ModuleConcatenationPlugin(),
            new MiniCssExtractPlugin({
                filename: LIBRARY_NAME + lib + '-' + version + '.css',
                chunkFilename: LIBRARY_NAME + lib + '-' + version + '.css'
            }),
            new webpack.DefinePlugin({
                __VERSION__: JSON.stringify(version)
            })
        ],
        optimization: {
            usedExports: true,
            concatenateModules: true,
            occurrenceOrder: true,
            minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})]
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: {
                                hmr: false,
                            },
                        },
                        'css-loader'
                    ],
                },
            ],
        }
    }
};


module.exports = (env, argv) => {
    return config(argv.lib ? ('.' + argv.lib) : '');
};