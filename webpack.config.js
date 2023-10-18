/* eslint-env node */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');	
const ImageminWebpWebpackPlugin= require("imagemin-webp-webpack-plugin");

const isProduction = process.env.NODE_ENV == 'production';

// const stats = {
//   all: false,
//   modules: true,
//   children: true,
//   chunks: true,
//   chunkModules: true,
//   chunkOrigins: true,
//   entrypoints: true,
//   hash: true,
//   reasons: true
// };

const config = {
  entry: './src/main.ts',
  output: {
    filename: isProduction ? '[name]-[contenthash].js' : '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,    
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  plugins: [    
    new VueLoaderPlugin(),
    new ForkTsCheckerWebpackPlugin(),    
    new HtmlWebpackPlugin({
      template: 'templates/index.html', 
      minify: {        
        removeComments: true,
        collapseWhitespace: true
      }                
    }),
    new MiniCssExtractPlugin({
      filename: isProduction ? '[name]-[contenthash].css' : '[name].css'
    }),      
    // new ImageminWebpWebpackPlugin({
    //   detailedLogs: true,
    //   overrideExtension: true,
    //   config: [{
    //     test: /\.(webp|jpe?g|png|gif)/,
    //     options: {
    //     quality:  50
    //     }
    //   }],
    // })
  ],
  devServer: {
    watchFiles: path.join(__dirname, 'src'),
    port: 9000,
    hot: true
    // static: {
    //   directory: path.join(__dirname, 'dist'),
    // }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.(j|t)sx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-env',
            'babel-preset-typescript-vue3',
            '@babel/preset-typescript'
          ]
        },
      },
      // {
      //   test: /\.tsx?$/,
      //   loader: 'ts-loader',
      //   options: {          
      //     appendTsSuffixTo: ['\\.vue$'],
      //     transpileOnly: true,
      //   },
      //   exclude: /node_modules/
      // },     
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
              esModule: false,
              name: isProduction ? '[name].[hash:7].[ext]' : '[name].[ext]',
              outputPath: 'images',                       
            }
          },          
          {
            loader: 'image-webpack-loader',            
          },          
        ],
        type: 'javascript/auto'
      },  
      {
        test: /\.(jpe?g)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: false,
              esModule: false,
              name: isProduction ? '[name].[hash:7].webp' : '[name].webp',
              outputPath: 'images',                       
            }
          },          
          {
            loader: 'webp-loader?{quality: 60}',            
          },          
        ], 
        type: 'javascript/auto'      
      },             
      {
        test: /\.html$/i,
        loader: 'html-loader'
      }

      // {
      //   test: /\.(png|svg|jpg|jpeg|gif)$/i,
      //   type: 'asset/resource',
      //   generator: {
      //     filename: 'static/assets/imgs/[hash][ext][query]',
      //   },
      // },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.vue'],
    alias: {
      '@': '/src'
      // 'vue':'vue/dist/vue.esm-bundler.js'
    }
  }
  //stats
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';
    config.optimization = {
      minimize: true,
      moduleIds: 'deterministic',
      innerGraph: true,
      concatenateModules: true,
      minimizer: [
        new TerserPlugin(),
        new CssMinimizerPlugin(),             
      ],
      splitChunks: {
        //minChunks: 3,
        chunks: 'all',
        minSize: 0,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/
          }
        }
      },
      runtimeChunk: {
        name: 'runtime'
      }
    };
  } else {
    config.mode = 'development';
    config.devtool = 'eval';
  }
  return config;
};
