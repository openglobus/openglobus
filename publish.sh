rm -rf dist api coverage types
npm run build
npm run generate_types
mkdir dist/publish
cp -r types dist/publish/
cp package.json dist/publish/
cp LICENSE.md dist/publish/
cp README.md dist/publish/
cp css/og.css dist/publish/
cp dist/@openglobus/og.esm.js dist/publish/index.js
cd dist/publish
npm publish --dry-run
cd ../..