const path = require('path');

module.exports = {
  entry: './dist-ts/index.ts', // der Einstiegspunkt Ihrer Anwendung
  output: {
    filename: 'index.js', // der Name der gebündelten Datei
    path: path.join(__dirname, 'dist'), // das Verzeichnis, in dem die gebündelte Datei gespeichert wird
    libraryTarget: 'module', // das Modulformat der gebündelten Datei
    globalObject: 'this', // stellt sicher, dass `this` auf das globale Objekt zeigt, egal wo der Code ausgeführt wird
  },
  experiments: {
    outputModule: true, // aktiviert das Modulformat der gebündelten Datei
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, // Regelt, welche Dateien von diesem Loader verarbeitet werden
        use: 'ts-loader', // der Name des Loaders, der verwendet wird, um TypeScript-Dateien zu verarbeiten
        exclude: /node_modules/, // schließt das node_modules-Verzeichnis aus
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'], // die Dateierweiterungen, die Webpack beim Auflösen von Modulen berücksichtigt
  },
  mode: 'development',
  devtool: 'source-map', // aktiviert die Erstellung von Source Maps
};