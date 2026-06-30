const fs = require('fs');
let content = fs.readFileSync('src/pages/Impex.tsx', 'utf8');

const regex = /<div className="bg-kawa-gray border border-gray-800 rounded-xl p-10 shadow-sm flex flex-col items-center justify-center min-h-\[400px\]">[\s\S]*?Base de Datos Local[\s\S]*?<\/div>/;

content = content.replace(regex, '<SavedPartsTab />');
fs.writeFileSync('src/pages/Impex.tsx', content);
console.log('done fixing tab');
