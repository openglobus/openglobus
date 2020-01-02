'use strict';

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const childProcess = require('child_process');

const LIBRARY_NAME = 'og';

var config = (lib) => {

    //NOT SURE
    let tag = childProcess.execSync('git tag --points-at HEAD --sort -version:refname').toString().trim();
    tag = tag.substr(1, tag.length);

    return {
        entry: path.resolve(__dirname, 'src/og/index' + lib + '.js'),
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: LIBRARY_NAME + lib + '-' + tag + '.js',
            library: LIBRARY_NAME,
            libraryTarget: 'umd',
            umdNamedDefine: true
        },
        plugins: [
            new webpack.optimize.ModuleConcatenationPlugin(),
            new MiniCssExtractPlugin({
                filename: LIBRARY_NAME + lib + '-' + tag + '.css',
                chunkFilename: LIBRARY_NAME + lib + '-' + tag + '.css'
            }),
            new webpack.DefinePlugin({
                __VERSION__: tag
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