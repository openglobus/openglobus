'use strict';

const webpack = require('webpack');

const NODE_ENV = process.env.NODE_ENV.trim().toLowerCase() || 'development';


module.exports = {
	entry: "./src/og/og.js",
	
    output: {
		filename: './dist/og.js',
		library: 'og'
    },
	
	watch: NODE_ENV == "development",
	
	watchOptions:{
		aggregateTimeout: 100
	},
	
	devtool: NODE_ENV === "development" ? "source-map": "",
	
	plugins:[
		new webpack.NoEmitOnErrorsPlugin(),
		new webpack.DefinePlugin({
			'NODE_ENV': JSON.stringify(NODE_ENV)
		})
	]
};

if(NODE_ENV == "production"){
	
	const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
	
	module.exports.plugins.push(
		new UglifyJsPlugin()
	);
}
