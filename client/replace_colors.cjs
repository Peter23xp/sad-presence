const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/bg-\[\#1e40af\]/g, 'bg-[#07bb20]');
    content = content.replace(/text-\[\#1e40af\]/g, 'text-black');
    content = content.replace(/text-blue-950/g, 'text-black');
    content = content.replace(/text-blue-900/g, 'text-black');
    content = content.replace(/text-blue-800/g, 'text-black');
    
    content = content.replace(/hover:bg-blue-800/g, 'hover:bg-[#069e1b]');
    content = content.replace(/hover:bg-blue-900/g, 'hover:bg-[#058a17]');
    content = content.replace(/hover:bg-blue-50/g, 'hover:bg-green-50');
    content = content.replace(/hover:bg-blue-100/g, 'hover:bg-green-100');
    content = content.replace(/hover:text-\[\#1e40af\]/g, 'hover:text-black');
    
    content = content.replace(/bg-blue-50/g, 'bg-green-50');
    content = content.replace(/bg-blue-100/g, 'bg-green-100');
    content = content.replace(/bg-blue-200/g, 'bg-green-200');
    content = content.replace(/bg-blue-500/g, 'bg-[#07bb20]');
    content = content.replace(/bg-blue-600/g, 'bg-[#07bb20]');
    
    content = content.replace(/border-\[\#1e40af\]/g, 'border-[#07bb20]');
    content = content.replace(/hover:border-\[\#1e40af\]/g, 'hover:border-[#07bb20]');
    
    content = content.replace(/from-slate-900 to-blue-950/g, 'from-slate-900 to-green-950');
    content = content.replace(/from-slate-50 to-blue-50/g, 'from-slate-50 to-green-50');
    content = content.replace(/shadow-blue-200/g, 'shadow-green-200');
    
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Colors replaced successfully!');
